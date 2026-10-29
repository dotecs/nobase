import { describe,it,expect } from 'vitest';
import { learningPlan,learningOutcome,readLearningPlan } from './learning-session';
import { context,items } from './rules/test-fixtures';
import { planned } from './rules/types';
import type { LearnItem } from './items';
const queue=['01-4','02-4','01-4','02-4','01-4','02-4'].map((id,n)=>planned({...items().find(i=>i.ability_id===id)!,id:id+'-'+n},'practice'));
const item={answer_spec:{type:'number',value:'1'},hints:[]} as unknown as LearnItem;
const start=()=>learningPlan(queue,context(),'test',{});
describe('verified queue skipping',()=>{
 it('skips two future A items after first A and shrinks visible total',()=>{const raw=start(),out=learningOutcome(raw,item,'correct_independent',{verifiedAbilities:['01-4']}),p=readLearningPlan([...raw,...out.append]);expect(out.feedback.skipped).toBe(2);expect(p.skipped.map(s=>s.queue_index)).toEqual([2,4]);expect(p.current.queue_index).toBe(1);expect(p.total).toBe(4);expect(p.meta.remaining).toBe(3);});
 it('second A skips only the one A not yet answered',()=>{let raw=start();for(let i=0;i<2;i++)raw=[...raw,...learningOutcome(raw,item,'correct_independent').append];const out=learningOutcome(raw,item,'correct_independent',{verifiedAbilities:['01-4']});expect(out.feedback.skipped).toBe(1);expect(readLearningPlan([...raw,...out.append]).current.queue_index).toBe(3);});
 it('all remaining verified abilities complete without attempts',()=>{const raw=start(),p=readLearningPlan([...raw,...learningOutcome(raw,item,'correct_independent',{verifiedAbilities:['01-4','02-4']}).append]);expect(p.complete).toBe(true);expect(p.total).toBe(1);expect(p.meta.remaining).toBe(0);});
 it('disabled early stop preserves the queue',()=>{const c=context();c.configs.session.stop_when_verified=false;const raw=learningPlan(queue,c,'test',{}),out=learningOutcome(raw,item,'correct_independent',{verifiedAbilities:['01-4']});expect(readLearningPlan([...raw,...out.append]).skipped).toHaveLength(0);expect(out.feedback.skipped).toBeUndefined();});
 it('retries keep the current question and later selections bypass existing skips',()=>{const raw=start(),retry=learningOutcome(raw,item,'incorrect',{verifiedAbilities:['01-4']}),p=readLearningPlan([...raw,...retry.append]);expect(p.current.queue_index).toBe(0);expect(retry.feedback.can_retry).toBe(true);let next=[...raw,...retry.append];next=[...next,...learningOutcome(next,item,'correct_assisted').append];next=[...next,...learningOutcome(next,item,'correct_independent').append];const q=readLearningPlan(next);expect(q.current.queue_index).toBe(3);expect(q.position).toBe(2);expect(q.total).toBe(4);expect(q.skipped).toHaveLength(2);});
});
