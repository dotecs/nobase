import { describe, expect, it } from 'vitest';
import { prepareCoachReview, prepareStateOverride, previewSessions } from './coach';
import { attempt,context,state,pack,items,now } from './rules/test-fixtures';
describe('coach decisions',()=>{
  it.each([['correct','correct_independent'],['partial','correct_assisted'],['incorrect','incorrect']] as const)('%s uses configured verdict %s',(verdict,expected)=>{const out=prepareCoachReview(state(),attempt('pending_review'),verdict,context(), []);expect(out.mapped).toBe(expected);expect(out.trace.rule_version).toEqual({evidence:2});});
  it('partial preserves state and adds no verification evidence',()=>{const out=prepareCoachReview(state('learning'),attempt('pending_review'),'partial',context(), []);expect(out.result.state).toMatchObject({state:'learning',evidence:{assisted:1,independent_correct:0,incorrect:0}});});
  it('mapping changes are read from config rather than hardcoded',()=>{const c=context();c.configs.evidence.coach_verdict_map.partial='incorrect';expect(prepareCoachReview(state(),attempt('pending_review'),'partial',c, []).result.state.state).toBe('needs_repair');});
  it('manual override requires a reason',()=>expect(()=>prepareStateOverride(state(),'verified','',now,context())).toThrow('사유'));
  it('manual verification records timestamp and trace',()=>{const out=prepareStateOverride(state(),'verified','풀이 확인',now,context());expect(out.result.evidence.verified_at).toBe(now);expect(out.trace.reasons).toEqual(['풀이 확인']);});
  it('two-session preview does not infer success or mutate states',()=>{const states=[state('learning')],before=structuredClone(states);const out=previewSessions({goal_id:'goal',status:'awaiting_coach',now,due_reviews:[]},states,pack(),items(),[],context());expect(out).toHaveLength(2);expect(states).toEqual(before);expect(out[0].result.items.length).toBeGreaterThan(0);});
});
