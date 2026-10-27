import { emptyEvidence, latestItems, MINUTE_MS, planned, timestamp, traced, type Attempt, type PlannedItem, type RuleContext, type RuleItem, type RulePack, type State } from './types';
type Config = RuleContext<'diagnostic' | 'recommendation'>;
function choose(ability: string, items: RuleItem[], config: Config, used: Set<string>, groups: Set<string>) {
  const order = config.configs.recommendation.diagnostic_usage_order;
  return latestItems(items).filter(item => item.ability_id === ability && order.includes(item.usage) && !used.has(item.id))
    .sort((a, b) => Number(groups.has(a.variant_group ?? a.id)) - Number(groups.has(b.variant_group ?? b.id)) || order.indexOf(a.usage) - order.indexOf(b.usage) || a.id.localeCompare(b.id))[0];
}
export function planDiagnosticBase(pack: RulePack, items: RuleItem[], config: Config) {
  const base = pack.diagnostic.base_abilities, selected: PlannedItem[] = [], missing: string[] = [], groups = new Set<string>();
  if (new Set(base).size !== base.length) throw new Error('Duplicate diagnostic abilities');
  for (const ability of base) {
    const item = choose(ability, items, config, new Set(selected.map(row => row.item_id)), groups);
    if (!item) missing.push(ability);
    else { selected.push(planned(item, 'diagnostic')); groups.add(item.variant_group ?? item.id); }
  }
  if (missing.length || selected.length < config.configs.diagnostic.base_items) throw new Error(`Insufficient diagnostic items: ${missing.join(', ') || `base_abilities (${selected.length}/${config.configs.diagnostic.base_items})`}`);
  return traced(selected, config, ['diagnostic', 'recommendation'], 'diagnostic_base', ['base_ability_order', 'latest_version', 'group_diversity'], { script_version: pack.diagnostic.version });
}
export function timeoutDiagnostic(pending: PlannedItem[], startedAt: string, now: string, config: RuleContext<'diagnostic'>) {
  const expired = timestamp(now) - timestamp(startedAt) >= config.configs.diagnostic.time_limit_min * MINUTE_MS;
  return traced(expired ? pending.map(item => ({ ...item, result: 'no_response' as const, at: now })) : [], config, ['diagnostic'], 'diagnostic_timeout', [expired ? 'time_limit' : 'within_limit']);
}
export type DiagnosticProgress = { base: PlannedItem[]; next_base_index: number; followups: number; attempted_item_ids: string[]; started_at: string; now: string };
export function nextDiagnosticFollowup(state: DiagnosticProgress, lastAttempt: Attempt, pack: RulePack, items: RuleItem[], config: Config) {
  const timed = timeoutDiagnostic(state.base.slice(state.next_base_index), state.started_at, state.now, config);
  const expired = timestamp(state.now) - timestamp(state.started_at) >= config.configs.diagnostic.time_limit_min * MINUTE_MS;
  const nextBase = () => ({ item: state.base[state.next_base_index] ?? null, next_base_index: Math.min(state.next_base_index + 1, state.base.length), followups: state.followups, no_response: timed.result });
  if (expired) return traced({ ...nextBase(), item: null, next_base_index: state.base.length }, config, ['diagnostic', 'recommendation'], 'diagnostic_followup', ['time_limit']);
  if (pack.diagnostic.followup_rule !== 'same_unit_previous') throw new Error('Unsupported diagnostic followup rule');
  const reasons: string[] = [];
  if (lastAttempt.result === 'incorrect' || lastAttempt.result === 'no_response') {
    if (state.followups < config.configs.diagnostic.max_followups) {
      const current = pack.abilities.find(row => row.id === lastAttempt.ability_id);
      if (!current) throw new Error('Unknown attempted ability');
      const previous = pack.abilities.filter(row => row.unit_id === current.unit_id && !row.is_supplement && row.order_in_unit < current.order_in_unit).sort((a, b) => b.order_in_unit - a.order_in_unit)[0];
      if (previous) {
        const item = choose(previous.id, items, config, new Set([...state.attempted_item_ids, lastAttempt.item_id]), new Set([lastAttempt.variant_group ?? lastAttempt.item_id]));
        if (!item) throw new Error(`Insufficient followup items: ${previous.id}`);
        return traced({ item: planned(item, 'diagnostic'), next_base_index: state.next_base_index, followups: state.followups + 1, no_response: [] }, config, ['diagnostic', 'recommendation'], 'diagnostic_followup', ['same_unit_previous'], { from: current.id, to: previous.id });
      }
      reasons.push('unit_start');
    } else reasons.push('max_followups');
  } else reasons.push('next_base');
  return traced(nextBase(), config, ['diagnostic', 'recommendation'], 'diagnostic_followup', reasons);
}
export function summarizeDiagnostic(attempts: Attempt[], pack: RulePack, config: RuleContext<'diagnostic'>) {
  const states: State[] = pack.abilities.map(ability => ({ ability_id: ability.id, state: 'unknown', evidence: emptyEvidence() }));
  for (const attempt of [...attempts].sort((a, b) => timestamp(a.at) - timestamp(b.at))) {
    const state = states.find(row => row.ability_id === attempt.ability_id);
    if (!state) throw new Error(`Unknown ability: ${attempt.ability_id}`);
    state.evidence.last_attempt_at = attempt.at;
    if (attempt.result === 'incorrect' || attempt.result === 'no_response') { state.state = 'needs_repair'; state.evidence.incorrect++; }
    else if (attempt.result === 'correct_independent') {
      if (state.state !== 'needs_repair') state.state = 'learning';
      state.evidence.independent_correct++;
      state.evidence.distinct_groups = [...new Set([...state.evidence.distinct_groups, attempt.variant_group ?? attempt.item_id])];
    } else if (attempt.result === 'correct_assisted') state.evidence.assisted++;
  }
  const queue = states.filter(row => row.state === 'needs_repair').map(row => row.ability_id), blocked = new Set<string>();
  while (queue.length) {
    const source = queue.shift()!;
    for (const edge of pack.edges.filter(row => row.type === 'prerequisite' && row.source_id === source)) {
      if (!blocked.has(edge.target_id)) { blocked.add(edge.target_id); queue.push(edge.target_id); }
    }
  }
  for (const state of states) if (blocked.has(state.ability_id)) { state.state = 'unknown'; state.evidence = emptyEvidence(); }
  return traced(states, config, ['diagnostic'], 'diagnostic_summary', ['independent_is_learning', 'unproven_dependents_unknown'], { blocked: [...blocked], script_version: pack.diagnostic.version });
}
