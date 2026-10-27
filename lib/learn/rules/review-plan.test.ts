import { describe,it,expect } from 'vitest';
import { context,items,attempt,now } from './test-fixtures';
import { planReview } from './review-plan';
const due=[{id:'due',ability_id:'01-4',due_at:now,interval_index:0,status:'due' as const}];
describe('review planning',()=>{
  it('selects unseen review first and records versions',()=>{const out=planReview(due,now,items(),[],context());expect(out.result.items[0].item_id).toBe('01-4-5');expect(out.trace.rule_version).toEqual({session:2,recommendation:1});});
  it('falls back to unseen practice and supports configured two items',()=>{const c=context();c.configs.session.review_items_per_ability=2;const out=planReview(due,now,items(),[attempt('correct_independent',{item_id:'01-4-5'})],c);expect(out.result.items).toHaveLength(2);expect(out.result.items.every(row=>row.usage==='practice'&&row.kind==='review')).toBe(true);});
  it('ignores future and done schedules',()=>{expect(planReview([{...due[0],status:'done'},{...due[0],due_at:'2099-01-01'}],now,items(),[],context()).result.empty_reason).toBe('no_due_reviews');});
  it('reports shortage without reusing seen items',()=>{expect(planReview(due,now,items(),items().map(row=>attempt('correct_independent',{item_id:row.id})),context()).result.empty_reason).toBe('insufficient_items');});
});
