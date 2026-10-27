import { DAY_MS, resetVerification, timestamp, traced, type Attempt, type Evidence, type RuleContext } from './types';
export type ReviewSchedule = { id?: string; ability_id: string; due_at: string; interval_index: number; status: 'due' | 'done' | 'skipped' };
export function scheduleReviews(ability: string, verifiedAt: string, config: RuleContext<'review_intervals'>) {
  const time = timestamp(verifiedAt);
  return traced(config.configs.review_intervals.days.map<ReviewSchedule>((day, interval_index) => ({ ability_id: ability, due_at: new Date(time + day * DAY_MS).toISOString(), interval_index, status: 'due' })), config, ['review_intervals'], 'schedule_reviews', ['intervals_from_verified']);
}
export function markReview(schedule: ReviewSchedule[], attempt: Attempt, config: RuleContext<'review_intervals' | 'evidence'>) {
  if (attempt.usage !== 'review') throw new Error('Review attempt required');
  const rows = structuredClone(schedule), current = rows.filter(row => row.ability_id === attempt.ability_id && row.status === 'due' && timestamp(row.due_at) <= timestamp(attempt.at)).sort((a, b) => a.interval_index - b.interval_index)[0];
  let state: 'recheck' | null = null, reset: Pick<Evidence, 'first_exposure_correct' | 'independent_correct' | 'distinct_groups' | 'reviews_passed' | 'verified_at'> | null = null;
  if (current && attempt.result === 'correct_independent') current.status = 'done';
  else if (current && (attempt.result === 'incorrect' || attempt.result === 'no_response')) {
    state = 'recheck';
    const evidence = resetVerification({ first_exposure_correct: 0, independent_correct: 0, distinct_groups: [], assisted: 0, incorrect: 0, last_attempt_at: attempt.at, verified_at: null, reviews_passed: 0 });
    reset = { first_exposure_correct: 0, independent_correct: evidence.independent_correct, distinct_groups: evidence.distinct_groups, reviews_passed: evidence.reviews_passed, verified_at: evidence.verified_at };
    for (const row of rows) if (row.ability_id === attempt.ability_id && row.status === 'due') row.status = 'skipped';
  }
  return traced({ schedule: rows, state, evidence_reset: reset, reschedule_after_verified: state === 'recheck' }, config, ['review_intervals', 'evidence'], 'mark_review', [current ? attempt.result : 'no_due_review']);
}
