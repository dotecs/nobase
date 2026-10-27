import { describe, expect, it } from 'vitest';
import { applyAttempt } from './states';
import { attempt, context, now, state } from './test-fixtures';
const all = ['unknown', 'needs_repair', 'learning', 'verified', 'retained', 'recheck'] as const;
describe('state transitions', () => {
  it('does not verify repeated items when unexposed evidence is required',()=>{
    const s=state('learning');s.evidence.independent_correct=3;s.evidence.distinct_groups=['other'];
    const out=applyAttempt(s,attempt(),context(),[attempt().item_id]);
    expect(out.result.state.state).toBe('learning');expect(out.result.state.evidence.first_exposure_correct).toBe(0);
  });
  it('verifies only after configured first-exposure independent successes',()=>{
    const c=context();c.configs.evidence.unexposed_needed=2;
    const s=state('learning');s.evidence.independent_correct=3;s.evidence.distinct_groups=['other'];
    const first=applyAttempt(s,attempt(),c,[]).result.state;expect(first.state).toBe('learning');expect(first.evidence.first_exposure_correct).toBe(1);
    const second=applyAttempt(first,attempt('correct_independent',{item_id:'new',variant_group:'new'}),c,[attempt().item_id]).result.state;
    expect(second.state).toBe('verified');expect(second.evidence.first_exposure_correct).toBe(2);
    expect(applyAttempt(second,attempt('incorrect'),c,[]).result.state.evidence.first_exposure_correct).toBe(0);
  });
  it.each(all)('%s + independent evidence', value => {
    const s = state(value); s.evidence.independent_correct = 1; s.evidence.distinct_groups = ['other'];
    const output = applyAttempt(s, attempt(), context(), []);
    expect(output.result.state.state).toBe(value === 'retained' ? 'retained' : 'verified');
    expect(output.result.event.rule_version).toEqual({ evidence: 2 });
    expect(JSON.parse(output.result.event.reason)).toEqual(output.trace);
  });
  it.each(all)('%s + assisted never changes state', value => {
    const output = applyAttempt(state(value), attempt('correct_assisted'), context(), []);
    expect(output.result.state.state).toBe(value); expect(output.result.state.evidence.assisted).toBe(1);
  });
  it.each(all.flatMap(s => (['incorrect', 'no_response'] as const).map(r => [s, r] as const)))('%s + %s', (s, r) => {
    const output = applyAttempt(state(s), attempt(r), context(), []);
    expect(output.result.state.state).toBe(s === 'verified' || s === 'retained' ? 'recheck' : 'needs_repair'); expect(output.result.state.evidence.incorrect).toBe(1);
  });
  it.each(all.flatMap(s => (['input_issue', 'pending_review'] as const).map(r => [s, r] as const)))('%s + %s leaves evidence counts alone', (s, r) => {
    const before = state(s), output = applyAttempt(before, attempt(r), context(), []);
    expect(output.result.state.state).toBe(s); expect(output.result.state.evidence.independent_correct).toBe(0);
  });
  it('one group cannot verify when distinct variants are required', () => { const s = state('learning'); s.evidence.independent_correct = 3; s.evidence.distinct_groups = ['g1']; expect(applyAttempt(s, attempt(), context(), []).result.state.state).toBe('learning'); });
  it('settings can permit one group', () => { const c = context(); c.configs.evidence.distinct_variants = false; c.configs.evidence.independent_correct_needed = 1; expect(applyAttempt(state(), attempt(), c, []).result.state.state).toBe('verified'); });
  it('distinct group threshold is configurable', () => { const c = context(), s = state('learning'); c.configs.evidence.distinct_groups_needed = 3; s.evidence.independent_correct = 3; s.evidence.distinct_groups = ['other']; expect(applyAttempt(s, attempt(), c, []).result.state.state).toBe('learning'); });
  it('reset on recheck keeps prior evidence in the append-only event', () => {
    const s = state('verified'); s.evidence = { ...s.evidence, independent_correct: 5, distinct_groups: ['a','b'], reviews_passed: 2, verified_at: now };
    const output = applyAttempt(s, attempt('incorrect'), context(), []);
    expect(output.result.state.evidence).toMatchObject({ independent_correct: 0, distinct_groups: [], reviews_passed: 0, verified_at: null });
    expect(JSON.parse(output.result.event.reason).details.before.independent_correct).toBe(5); expect(s.evidence.independent_correct).toBe(5);
  });
  it('retained error enters recheck and clears verification evidence', () => {
    const s = state('retained'); s.evidence = { ...s.evidence, independent_correct: 8, distinct_groups: ['a','b'], reviews_passed: 3, verified_at: now };
    expect(applyAttempt(s, attempt('incorrect'), context(), []).result.state).toMatchObject({ state: 'recheck', evidence: { independent_correct: 0, distinct_groups: [], reviews_passed: 0, verified_at: null } });
  });
  it('reverification records a new verified timestamp', () => { const s = state('recheck'); s.evidence.independent_correct = 1; s.evidence.distinct_groups = ['old']; expect(applyAttempt(s, attempt(), context(), []).result.state.evidence.verified_at).toBe(now); });
  it.each([[3, 3, 'retained'], [2, 3, 'verified'], [3, 2, 'verified']] as const)('retention: %i days, %i reviews -> %s', (days, reviews, expected) => {
    const s = state('verified'); s.evidence.verified_at = new Date(Date.parse(now) - days * 86400000).toISOString(); s.evidence.reviews_passed = reviews - 1;
    expect(applyAttempt(s, attempt('correct_independent', { usage: 'review' }), context(), []).result.state.state).toBe(expected);
  });
  it('practice success does not count as review', () => expect(applyAttempt(state('verified'), attempt(), context(), []).result.state.evidence.reviews_passed).toBe(0));
  it('rejects ability mismatch', () => expect(() => applyAttempt(state(), attempt('incorrect', { ability_id: '02-1' }), context(), [])).toThrow('mismatch'));
  it('missing rule version fails instead of writing an unversioned decision', () => { const c = context(); c.rule_version.evidence = 0; expect(() => applyAttempt(state(), attempt(), c, [])).toThrow('version'); });
});
