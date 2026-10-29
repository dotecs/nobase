import { describe, expect, it } from 'vitest';
import { planSession, type SessionLearner } from './recommend';
import { attempt, context, items, now, pack, state } from './test-fixtures';
const learner = (): SessionLearner => ({ goal_id: 'goal', status: 'active', now, due_reviews: [] });
describe('session recommendation', () => {
  it('uses configured session size and active ability limits', () => {
    const c = context(); c.configs.session.new_ability_per_session = 2;
    const output = planSession(learner(), [], pack(), items(), [], c);
    expect(output.result.items).toHaveLength(8); expect(new Set(output.result.items.map(row => row.ability_id)).size).toBe(2);
    expect(output.trace.rule_version).toEqual({ recommendation: 1, session: 2 });
  });
  it('opens no more than one unknown ability by default', () => expect(new Set(planSession(learner(), [], pack(), items(), [], context()).result.items.map(row => row.ability_id)).size).toBe(1));
  it('prioritizes repair states in book order', () => {
    const out = planSession(learner(), [state('learning','01-4'), state('needs_repair','02-4'), state('needs_repair','03-1')], pack(), items(), [], context());
    expect(out.result.items[0].ability_id).toBe('02-4');
  });
  it('redirects to a repair prerequisite outside the goal list', () => {
    const out = planSession(learner(), [state('needs_repair','01-2')], pack(), items(), [], context());
    expect(out.result.items[0].ability_id).toBe('01-2'); expect(out.result.items.some(row => row.ability_id === '01-4')).toBe(false);
    expect(out.trace.reasons.some(reason => reason.startsWith('prerequisite:'))).toBe(true);
  });
  it('deduplicates stems and never places identical groups adjacently', () => {
    const input = items().filter(row => row.ability_id === '01-4'); input[2].stem_md = input[1].stem_md; input[3].variant_group = input[1].variant_group;
    const out = planSession(learner(), [], pack(), input, [], context()).result.items;
    expect(new Set(out.map(row => input.find(item => item.id === row.item_id)!.stem_md)).size).toBe(out.length);
    expect(out.every((row, i) => !i || row.variant_group !== out[i - 1].variant_group)).toBe(true);
  });
  it('does not select a repair ability before its own repair prerequisite', () => {
    const out = planSession(learner(), [state('needs_repair','01-1'), state('needs_repair','01-2')], pack(), items(), [], context()).result.items;
    expect(out.some(row => row.ability_id === '01-1')).toBe(true);
    expect(out.some(row => row.ability_id === '01-2' || row.ability_id === '01-4')).toBe(false);
  });
  it('duplicate stem setting can be changed', () => {
    const input = items().filter(row => row.ability_id === '01-4'); input.forEach(row => row.stem_md = 'same'); const c = context(); c.configs.recommendation.skip_duplicate_stems = false;
    expect(planSession(learner(), [], pack(), input, [], c).result.items.length).toBeGreaterThan(1);
  });
  it('unseen items precede previously solved ones', () => {
    const out = planSession(learner(), [], pack(), items(), [attempt('correct_independent', { item_id: '01-4-1' })], context()).result.items;
    expect(out[0].item_id).not.toBe('01-4-1');
  });
  it('incorrect items are excluded in favor of another variant', () => {
    const out = planSession(learner(), [], pack(), items(), [attempt('incorrect', { item_id: '01-4-1' })], context()).result.items;
    expect(out.some(row => row.item_id === '01-4-1')).toBe(false); expect(out.some(row => row.ability_id === '01-4')).toBe(true);
  });
  it('inserts due reviews before practice and respects changed cap', () => {
    const l = learner(), c = context(); c.configs.session.max_review_items = 1;
    l.due_reviews = ['01-4','02-4'].map(ability_id => ({ ability_id, due_at: now, interval_index: 0, status: 'due' }));
    const out = planSession(l, [state('verified','01-4'),state('verified','02-4')], pack(), items(), [], c).result.items;
    expect(out[0].kind).toBe('review'); expect(out[0].usage).toBe('review'); expect(out.filter(row => row.kind === 'review')).toHaveLength(1);
  });
  it('review falls back to practice', () => {
    const l = learner(); l.due_reviews = [{ ability_id: '01-4', due_at: now, interval_index: 0, status: 'due' }];
    expect(planSession(l, [state('verified')], pack(), items().filter(row => row.usage !== 'review'), [], context()).result.items[0].usage).toBe('practice');
  });
  it('future reviews do not enter the session', () => {
    const l = learner(); l.due_reviews = [{ ability_id: '01-4', due_at: '2027-01-01', interval_index: 0, status: 'due' }];
    expect(planSession(l, [], pack(), items(), [], context()).result.items.every(row => row.kind === 'practice')).toBe(true);
  });
  it('uses latest versions only', () => { const input = items(); input.push({ ...input[19], version: 2 }); expect(planSession(learner(), [], pack(), input, [], context()).result.items.find(row => row.item_id === '01-4-1')!.item_version).toBe(2); });
  it('fully mastered goal has an explicit empty reason', () => { const p = pack(); expect(planSession(learner(), p.goals.requirements.map(row => state('verified',row.ability_id)), p, items(), [], context()).result.empty_reason).toBe('all_goals_mastered'); });
  it('item shortage has an explicit empty reason', () => expect(planSession(learner(), [], pack(), [], [], context()).result.empty_reason).toBe('insufficient_items'));
  it('gate waiting prevents planning', () => expect(planSession({ ...learner(), status: 'awaiting_coach' }, [], pack(), items(), [], context()).result.empty_reason).toBe('learner_not_active'));
  it('never mutates input snapshots', () => {
    const l = learner(), p = pack(), i = items(), s = [state('learning')], h = [attempt()], c = context(), before = structuredClone({ l,p,i,s,h,c });
    planSession(l,s,p,i,h,c); expect({ l,p,i,s,h,c }).toEqual(before);
  });
});

describe('group diversity',()=>{
 const grouped=()=>items().filter(row=>['01-4','02-4'].includes(row.ability_id)).map((row,index)=>({...row,usage:'practice' as const,variant_group:row.ability_id+(index%6===5?'-B':'-A')}));
 it('selects the group missing from evidence before an earlier id',()=>{const a=state('learning');a.evidence.distinct_groups=['01-4-A'];const out=planSession(learner(),[a],pack(),grouped().filter(row=>row.ability_id==='01-4'),[],context());expect(out.result.items[0].variant_group).toBe('01-4-B');expect(out.trace.reasons).toContain('group_diversity');});
 it('falls back to existing groups when a new group is unavailable',()=>{const a=state('learning');a.evidence.distinct_groups=['01-4-A'];expect(planSession(learner(),[a],pack(),grouped().filter(row=>row.ability_id==='01-4'&&!row.variant_group.endsWith('-B')),[],context()).result.items[0].variant_group).toBe('01-4-A');});
 it('diversifies each ability across alternating selections',()=>{const out=planSession(learner(),[state('learning','01-4'),state('learning','02-4')],pack(),grouped(),[],context()).result.items;for(const id of ['01-4','02-4']){const group=out.filter(row=>row.ability_id===id);expect(group.length).toBeGreaterThanOrEqual(2);expect(group[1].variant_group).not.toBe(group[0].variant_group);}});
});
