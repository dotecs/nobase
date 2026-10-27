import type { AbilityState, AttemptResult, ItemUsage } from '../types';
import type { ContentPackData } from '../pack-schema';
import type { RuleConfigs, RuleKey } from './schema';

export type RuleVersion = Record<string, number>;
export type RuleContext<K extends RuleKey = RuleKey> = { configs: Pick<RuleConfigs, K>; rule_version: Record<K, number> };
export type Trace = { rule_version: RuleVersion; rule: string; reasons: string[]; details: unknown };
export function traced<T>(result: T, context: { rule_version: RuleVersion }, keys: RuleKey[], rule: string, reasons: string[], details: unknown = null): { result: T; trace: Trace } {
  const rule_version = Object.fromEntries(keys.map(key => {
    const version = context.rule_version[key];
    if (!Number.isInteger(version) || version < 1) throw new Error(`Missing rule version: ${key}`);
    return [key, version];
  }));
  return { result, trace: { rule_version, rule, reasons, details } };
}
export type RulePack = Pick<ContentPackData, 'units' | 'abilities' | 'edges' | 'goals' | 'diagnostic'>;
export type RuleItem = { id: string; version: number; ability_id: string; usage: ItemUsage; variant_group: string | null; stem_md: string; status: string };
export type PlannedItem = { item_id: string; item_version: number; ability_id: string; variant_group: string; usage: ItemUsage; kind: ItemUsage };
export type Attempt = { id: string; item_id: string; item_version: number; ability_id: string; variant_group: string | null; result: AttemptResult; usage: ItemUsage; at: string; session_id?: string };
export type Evidence = { independent_correct: number; distinct_groups: string[]; assisted: number; incorrect: number; last_attempt_at: string | null; verified_at: string | null; reviews_passed: number };
export type State = { ability_id: string; state: AbilityState; evidence: Evidence };
export const emptyEvidence = (): Evidence => ({ independent_correct: 0, distinct_groups: [], assisted: 0, incorrect: 0, last_attempt_at: null, verified_at: null, reviews_passed: 0 });
export function resetVerification(evidence: Evidence): Evidence { return { ...evidence, independent_correct: 0, distinct_groups: [], reviews_passed: 0, verified_at: null }; }
export function timestamp(value: string) { const time = Date.parse(value); if (!Number.isFinite(time)) throw new Error(`Invalid timestamp: ${value}`); return time; }
export const DAY_MS = 24 * 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;
export function latestItems(items: RuleItem[]) {
  const latest = new Map<string, RuleItem>();
  for (const item of items) if (!latest.has(item.id) || latest.get(item.id)!.version < item.version) latest.set(item.id, item);
  return [...latest.values()].filter(item => item.status === 'reviewed' || item.status === 'live').sort((a, b) => a.id.localeCompare(b.id));
}
export function planned(item: RuleItem, kind: ItemUsage): PlannedItem {
  return { item_id: item.id, item_version: item.version, ability_id: item.ability_id, variant_group: item.variant_group ?? item.id, usage: item.usage, kind };
}
export function bookOrder(pack: RulePack, a: string, b: string) {
  const aa = pack.abilities.find(row => row.id === a)!, bb = pack.abilities.find(row => row.id === b)!;
  return (pack.units.find(row => row.id === aa.unit_id)!.order - pack.units.find(row => row.id === bb.unit_id)!.order) || aa.order_in_unit - bb.order_in_unit || a.localeCompare(b);
}
