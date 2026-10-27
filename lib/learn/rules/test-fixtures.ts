import { readFileSync } from 'node:fs';
import { ruleSchemas, type RuleKey } from './schema';
import { emptyEvidence, type Attempt, type RuleContext, type RuleItem, type RulePack, type State } from './types';
export const now = '2026-10-27T00:00:00.000Z';
export function context(): RuleContext {
  const configs: Record<string, unknown> = {}, rule_version: Record<string, number> = {};
  for (const path of ['040_learn_content.sql', '046_learn_runtime.sql', '049_learn_session_rules.sql']) {
    const sql = readFileSync(`supabase/migrations/${path}`, 'utf8');
    for (const match of sql.matchAll(/\('([^']+)', (\d+), '([^']+)'::jsonb\)/g)) {
      const key = match[1] as RuleKey;
      if (key in ruleSchemas) { configs[key] = JSON.parse(match[3]); rule_version[key] = Number(match[2]); }
    }
  }
  for (const key of Object.keys(configs) as RuleKey[]) configs[key] = ruleSchemas[key].parse(configs[key]);
  return { configs, rule_version } as RuleContext;
}
export function pack(): RulePack {
  const units = Array.from({ length: 6 }, (_, i) => ({ id: `u${i + 1}`, pack_id: 'test', order: i + 1, title: 'Unit', slide_pages: null, tier: 'mvp1' as const }));
  const abilities = units.flatMap((unit, i) => Array.from({ length: 4 }, (_, j) => ({ id: `0${i + 1}-${j + 1}`, pack_id: 'test', unit_id: unit.id, order_in_unit: j + 1, name: 'Ability', action: 'Solve', kind: 'procedure' as const, slide_pages: null, is_supplement: false, request_ability: null, source_node_id: null, status: 'live' })));
  const base_abilities = ['01-4', '02-4', '03-1', '04-1', '05-1', '06-1'];
  return { units, abilities, edges: abilities.filter(row => row.order_in_unit > 1).map(row => ({ id: row.id, pack_id: 'test', source_id: row.id.slice(0, 3) + (row.order_in_unit - 1), target_id: row.id, type: 'prerequisite' as const, origin: 'book_order' as const, status: 'hypothesis', reason: null })), goals: { goals: [{ id: 'goal', pack_id: 'test', title: 'Goal', track: null, year: null, evidence: null }], requirements: base_abilities.map(ability_id => ({ goal_id: 'goal', ability_id, required_level: 'verified' as const, format_notes: null })) }, diagnostic: { id: 'script', goal_id: 'goal', version: 1, base_abilities, followup_rule: 'same_unit_previous', base_items: [], followups: [] } };
}
export function items(): RuleItem[] {
  return pack().abilities.flatMap(ability => Array.from({ length: 6 }, (_, n) => ({ id: `${ability.id}-${n}`, version: 1, ability_id: ability.id, usage: n === 0 ? 'assessment' as const : n === 5 ? 'review' as const : 'practice' as const, variant_group: `${ability.id}-g${n}`, stem_md: `${ability.id} question ${n}`, status: 'reviewed' })));
}
export function state(value: State['state'] = 'unknown', ability_id = '01-4'): State { return { ability_id, state: value, evidence: emptyEvidence() }; }
export function attempt(result: Attempt['result'] = 'correct_independent', fields: Partial<Attempt> = {}): Attempt {
  return { id: 'attempt', item_id: '01-4-1', item_version: 1, ability_id: '01-4', variant_group: 'g1', result, usage: 'practice', at: now, ...fields };
}
