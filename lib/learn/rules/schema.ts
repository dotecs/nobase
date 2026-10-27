import { z } from 'zod';
const integer = z.number().int().nonnegative();
const positive = z.number().int().positive();
const usage = z.enum(['diagnostic', 'practice', 'assessment', 'review']);
const usages = z.array(usage).min(1).refine(values => new Set(values).size === values.length);
export const ruleSchemas = {
  diagnostic: z.object({ base_items: positive, max_followups: integer, time_limit_min: positive }),
  evidence: z.object({ independent_correct_needed: positive, distinct_variants: z.boolean(), distinct_groups_needed: positive, unexposed_needed: integer, retained_after_days: integer, retained_reviews: positive, photo_required_usages: z.array(usage), photo_optional_usages: z.array(usage), coach_verdict_map: z.object({correct:z.enum(['correct_independent','correct_assisted','incorrect']),partial:z.enum(['correct_independent','correct_assisted','incorrect']),incorrect:z.enum(['correct_independent','correct_assisted','incorrect'])}) }),
  review_intervals: z.object({ days: z.array(positive).min(1).refine(days => days.every((day, i) => !i || day > days[i - 1])) }),
  gate: z.object({ coach_gate_after_diagnostic: z.boolean() }),
  session: z.object({ items_per_session: positive, max_minutes: positive, max_hints_per_item: integer, new_ability_per_session: integer, max_review_items: integer }),
  recommendation: z.object({ order: z.literal('book'), prefer_states: z.array(z.enum(['unknown', 'needs_repair', 'learning', 'verified', 'retained', 'recheck'])).min(1), max_abilities_in_progress: positive, skip_duplicate_stems: z.boolean(), diagnostic_usage_order: usages, practice_usage_order: usages, review_usage_order: usages }),
  solvers: z.object({ default: z.string().min(1), by_pack: z.record(z.string(), z.string().min(1)) }),
};
export type RuleKey = keyof typeof ruleSchemas;
export type RuleConfigs = { [K in RuleKey]: z.infer<(typeof ruleSchemas)[K]> };
