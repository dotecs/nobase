import { bookOrder, latestItems, planned, timestamp, traced, type Attempt, type PlannedItem, type RuleContext, type RuleItem, type RulePack, type State } from './types';
import type { ReviewSchedule } from './review';
type Config = RuleContext<'recommendation' | 'session' | 'evidence'>;
export type SessionLearner = { goal_id: string; status: string; now: string; due_reviews: ReviewSchedule[] };
export function planSession(learner: SessionLearner, states: State[], pack: RulePack, items: RuleItem[], history: Attempt[], config: Config) {
  const { recommendation: rule, session } = config.configs, selected: PlannedItem[] = [], reasons: string[] = [], selectedAbilities = new Set<string>();
  const finish = (empty_reason: string | null) => traced({ items: selected, empty_reason }, config, ['recommendation', 'session', 'evidence'], 'plan_session', reasons, { selected_abilities: [...selectedAbilities] });
  if (learner.status !== 'active') { reasons.push('learner_not_active'); return finish('learner_not_active'); }
  const status = (id: string) => states.find(row => row.ability_id === id)?.state ?? 'unknown';
  const available = latestItems(items), used = new Set<string>(), stems = new Set<string>();
  const seen = new Set(history.map(row => row.item_id));
  const wrong = new Set(history.filter(row => row.result === 'incorrect' || row.result === 'no_response').map(row => row.item_id));
  const choose = (ability: string, usageOrder: Config['configs']['recommendation']['practice_usage_order']) => {
    const groups=new Set([...(states.find(row=>row.ability_id===ability)?.evidence.distinct_groups??[]),...selected.filter(row=>row.ability_id===ability).map(row=>row.variant_group)]);
    const previousGroup = selected.at(-1)?.variant_group;
    return available.filter(row => row.ability_id === ability && usageOrder.includes(row.usage) && !used.has(row.id) && !wrong.has(row.id)
      && (!rule.skip_duplicate_stems || !stems.has(row.stem_md)) && (row.variant_group ?? row.id) !== previousGroup)
      .sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) || Number(groups.has(a.variant_group??a.id))-Number(groups.has(b.variant_group??b.id)) || usageOrder.indexOf(a.usage) - usageOrder.indexOf(b.usage) || a.id.localeCompare(b.id))[0];
  };
  const add = (item: RuleItem, kind: 'practice' | 'review') => {
    selected.push(planned(item, kind)); used.add(item.id); stems.add(item.stem_md);
  };
  const prereqs = (id: string, path = new Set<string>()): string[] => {
    if (path.has(id)) throw new Error('Prerequisite cycle');
    const next = new Set([...path, id]);
    const parents = pack.edges.filter(edge => edge.type === 'prerequisite' && edge.target_id === id).map(edge => edge.source_id);
    const repairs = parents.flatMap(parent => [...prereqs(parent, next), ...(status(parent) === 'needs_repair' ? [parent] : [])]);
    return [...new Set(repairs)].sort((a, b) => bookOrder(pack, a, b));
  };
  let unknowns = 0;
  const admit = (ability: string) => {
    if (selectedAbilities.has(ability)) return true;
    if (selectedAbilities.size >= rule.max_abilities_in_progress || (status(ability) === 'unknown' && unknowns >= session.new_ability_per_session)) return false;
    selectedAbilities.add(ability); if (status(ability) === 'unknown') unknowns++;
    return true;
  };
  const due = [...learner.due_reviews].filter(row => row.status === 'due' && timestamp(row.due_at) <= timestamp(learner.now)).sort((a, b) => timestamp(a.due_at) - timestamp(b.due_at) || bookOrder(pack, a.ability_id, b.ability_id));
  const reviewed = new Set<string>();
  for (const row of due) {
    if (selected.length >= Math.min(session.max_review_items, session.items_per_session)) break;
    if (reviewed.has(row.ability_id) || prereqs(row.ability_id).length) continue;
    const item = choose(row.ability_id, rule.review_usage_order);
    if (item && admit(row.ability_id)) { add(item, 'review'); reviewed.add(row.ability_id); reasons.push(`due_review:${row.ability_id}`); }
  }
  const goals = pack.goals.requirements.filter(row => row.goal_id === learner.goal_id).map(row => row.ability_id);
  const targets = goals.filter(id => rule.prefer_states.includes(status(id))).sort((a, b) => rule.prefer_states.indexOf(status(a)) - rule.prefer_states.indexOf(status(b)) || bookOrder(pack, a, b));
  const candidates: string[] = [];
  for (const target of targets) {
    const repairs = prereqs(target);
    if (repairs.length) reasons.push(`prerequisite:${target}->${repairs.join(',')}`);
    for (const id of repairs.length ? repairs.filter(ability => prereqs(ability).length === 0) : [target]) if (!candidates.includes(id)) candidates.push(id);
  }
  const cap=(ability:string)=>Math.max(1,config.configs.evidence.independent_correct_needed-(states.find(row=>row.ability_id===ability)?.evidence.independent_correct??0))+(session.per_ability_buffer??1);
  for(const ability of candidates)reasons.push(`per_ability_cap:${ability}=${cap(ability)}`);
  // Only count an ability as opened after an eligible item is found.
  while (selected.length < session.items_per_session) {
    let added = false;
    for (const ability of candidates) {
      if(selected.filter(row=>row.kind!=='review'&&row.ability_id===ability).length>=cap(ability))continue;
      const item = choose(ability, rule.practice_usage_order);
      if (!item || !admit(ability)) continue;
      add(item, 'practice'); added = true;
      if (selected.length >= session.items_per_session) break;
    }
    if (!added) break;
  }
  reasons.push('group_diversity', 'unseen_first', 'latest_version', 'no_adjacent_group', 'incorrect_items_excluded');
  if (rule.skip_duplicate_stems) reasons.push('unique_stems');
  return finish(selected.length ? null : goals.length && goals.every(id => status(id) === 'verified' || status(id) === 'retained') ? 'all_goals_mastered' : 'insufficient_items');
}
