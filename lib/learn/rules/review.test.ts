import { describe, expect, it } from 'vitest';
import { markReview, scheduleReviews } from './review';
import { attempt, context, now } from './test-fixtures';
describe('review schedule', () => {
  it('schedules 1,3,7 days from verification', () => {
    const output = scheduleReviews('01-4', now, context());
    expect(output.result.map(row => row.due_at)).toEqual(['2026-10-28T00:00:00.000Z','2026-10-30T00:00:00.000Z','2026-11-03T00:00:00.000Z']);
    expect(output.trace.rule_version).toEqual({ review_intervals: 1 });
  });
  it('reads interval changes from config', () => { const c = context(); c.configs.review_intervals.days = [2, 5]; expect(scheduleReviews('01-4', now, c).result).toHaveLength(2); });
  it('success completes only the current interval', () => {
    const rows = scheduleReviews('01-4', now, context()).result;
    const output = markReview(rows, attempt('correct_independent', { usage: 'review', at: '2026-10-28T00:00:00Z' }), context());
    expect(output.result.schedule.map(row => row.status)).toEqual(['done', 'due', 'due']); expect(rows.every(row => row.status === 'due')).toBe(true);
  });
  it.each(['incorrect', 'no_response'] as const)('%s skips current and remaining intervals and resets verification', result => {
    const rows = scheduleReviews('01-4', now, context()).result;
    const output = markReview(rows, attempt(result, { usage: 'review', at: '2026-10-28T00:00:00Z' }), context());
    expect(output.result.schedule.every(row => row.status === 'skipped')).toBe(true);
    expect(output.result).toMatchObject({ state: 'recheck', reschedule_after_verified: true, evidence_reset: { independent_correct: 0, distinct_groups: [], reviews_passed: 0, verified_at: null } });
  });
  it.each(['correct_assisted', 'input_issue', 'pending_review'] as const)('%s cannot pass a review', result => {
    const rows = scheduleReviews('01-4', now, context()).result;
    expect(markReview(rows, attempt(result, { usage: 'review', at: '2026-10-28T00:00:00Z' }), context()).result.schedule).toEqual(rows);
  });
  it('future schedules remain pending', () => { const rows = scheduleReviews('01-4', now, context()).result; expect(markReview(rows, attempt('incorrect', { usage: 'review' }), context()).result.schedule).toEqual(rows); });
  it('other abilities and finished intervals remain untouched', () => {
    const rows = [...scheduleReviews('01-4', now, context()).result, ...scheduleReviews('02-1', now, context()).result]; rows[0].status = 'done';
    const out = markReview(rows, attempt('incorrect', { usage: 'review', at: '2026-10-30T00:00:00Z' }), context()).result.schedule;
    expect(out.map(row => row.status)).toEqual(['done','skipped','skipped','due','due','due']);
  });
});
