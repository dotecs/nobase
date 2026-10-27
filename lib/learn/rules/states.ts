import { DAY_MS, resetVerification, timestamp, traced, type Attempt, type RuleContext, type State } from './types';

export function applyAttempt(state: State, attempt: Attempt, config: RuleContext<'evidence'>, attempted_item_ids: readonly string[]) {
  if (state.ability_id !== attempt.ability_id) throw new Error('Attempt ability mismatch');
  timestamp(attempt.at);
  const next = structuredClone(state), evidence = next.evidence, rule = config.configs.evidence;
  evidence.first_exposure_correct ??= 0;
  evidence.last_attempt_at = attempt.at;
  if (attempt.result === 'correct_independent') {
    evidence.independent_correct++;
    if (!attempted_item_ids.includes(attempt.item_id)) evidence.first_exposure_correct++;
    evidence.distinct_groups = [...new Set([...evidence.distinct_groups, attempt.variant_group ?? attempt.item_id])];
    if (attempt.usage === 'review') evidence.reviews_passed++;
    if (state.state !== 'verified' && state.state !== 'retained') {
      next.state = 'learning';
      if (evidence.independent_correct >= rule.independent_correct_needed && evidence.first_exposure_correct >= rule.unexposed_needed && (!rule.distinct_variants || evidence.distinct_groups.length >= rule.distinct_groups_needed)) {
        next.state = 'verified'; evidence.verified_at = attempt.at;
      }
    }
    if (state.state === 'verified' && attempt.usage === 'review' && evidence.verified_at && evidence.reviews_passed >= rule.retained_reviews && timestamp(attempt.at) - timestamp(evidence.verified_at) >= rule.retained_after_days * DAY_MS) next.state = 'retained';
  } else if (attempt.result === 'correct_assisted') evidence.assisted++;
  else if (attempt.result === 'incorrect' || attempt.result === 'no_response') {
    evidence.incorrect++;
    next.state = state.state === 'verified' || state.state === 'retained' ? 'recheck' : 'needs_repair';
    if (next.state === 'recheck') next.evidence = resetVerification(evidence);
  }
  const decision = traced(next, config, ['evidence'], 'apply_attempt', [attempt.result, `${state.state}->${next.state}`], { before: state.evidence, after: next.evidence });
  const event = { ability_id: state.ability_id, attempt_id: attempt.id, from_state: state.state, to_state: next.state,
    reason: JSON.stringify(decision.trace), rule_version: decision.trace.rule_version, created_at: attempt.at };
  return { result: { state: next, event }, trace: decision.trace };
}
