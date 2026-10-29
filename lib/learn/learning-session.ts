import type { StepCheck } from './mathcheck/steps';
import { LearnUserError } from './errors';
import { AnswerSpec } from './answer-spec';
import type { LearnItem } from './items';
import type { AttemptResult } from './types';
import type { PlannedItem, RuleContext } from './rules/types';
export type LearningStep={type:'item';item:PlannedItem;queue_index:number;plan_index:number;retries_used:number;hints_used:number};
export type LearningMeta={type:'learning';queue:PlannedItem[];config:RuleContext;pack_id:string;trace:unknown};
export type Feedback={skipped?:number;input?:string|string[];reason?:string;step_check?:StepCheck;type:'feedback';plan_index:number;result:AttemptResult;can_retry:boolean;hint:string|null;answer:string|null;explanation:string|null};
export type SkippedStep={type:'skipped';item:PlannedItem;queue_index:number;reason:'verified'};
export type LearningEntry=LearningMeta|LearningStep|Feedback|SkippedStep|{type:'complete'};
export function learningPlan(queue:PlannedItem[],config:RuleContext,packId:string,trace:unknown):LearningEntry[] {
  if(!queue.length)throw new LearnUserError('추천할 문항이 없습니다.');
  return [{type:'learning',queue,config,pack_id:packId,trace},{type:'item',item:queue[0],queue_index:0,plan_index:0,retries_used:0,hints_used:0}];
}
export function readLearningPlan(raw:unknown) {
  if(!Array.isArray(raw)||raw[0]?.type!=='learning')throw new Error('잘못된 학습 세션입니다.');
  const plan=raw as LearningEntry[],meta=plan[0] as LearningMeta;
  const current=plan.filter((row):row is LearningStep=>row.type==='item').at(-1);if(!current)throw new Error('학습 문항이 없습니다.');
  const skipped=plan.filter((row):row is SkippedStep=>row.type==='skipped'),indices=new Set(skipped.map(row=>row.queue_index)),complete=plan.some(row=>row.type==='complete');
  const remaining=complete?0:meta.queue.filter((_,index)=>index>=current.queue_index&&!indices.has(index)).length;
  return {meta:{...meta,remaining},current,skipped,total:meta.queue.length-indices.size,position:current.queue_index-[...indices].filter(index=>index<current.queue_index).length,complete,feedback:plan.filter((row):row is Feedback=>row.type==='feedback').at(-1)??null};
}
function hintText(item:LearnItem,index:number) {
  if(!Array.isArray(item.hints))return null;
  const hint=item.hints[index];return typeof hint==='string'?hint:hint&&typeof hint==='object'&&!Array.isArray(hint)&&typeof hint.text_md==='string'?hint.text_md:null;
}
function answerText(item:LearnItem) {
  const spec=AnswerSpec.parse(item.answer_spec);
  if(spec.type==='number')return `${spec.variable?spec.variable+spec.relation:''}${spec.value}`;
  if(spec.type==='fraction'||spec.type==='expression')return spec.value;
  if(spec.type==='choice')return spec.correct.map(id=>spec.options.find(option=>option.id===id)?.text_md??id).join(', ');
  return null;
}
export function learningOutcome(raw:unknown,item:LearnItem,result:AttemptResult,options:{verifiedAbilities:string[]}={verifiedAbilities:[]}) {
  const {meta,current,skipped:existing}=readLearningPlan(raw),rule=meta.config.configs.session;
  const retry=result==='incorrect'&&current.retries_used<rule.retry_per_item;
  const nextHints=retry?Math.min(rule.max_hints_per_item,current.hints_used+1):current.hints_used;
  const feedback:Feedback={type:'feedback',plan_index:current.plan_index,result,can_retry:retry,
    hint:retry&&nextHints>0?hintText(item,0):null,answer:result==='incorrect'&&!retry?answerText(item):null,
    explanation:result==='incorrect'&&!retry?hintText(item,1):null};
  const indices=new Set(existing.map(row=>row.queue_index)),skipped:SkippedStep[]=[];
  if(rule.stop_when_verified??true)meta.queue.forEach((item,index)=>{if(index>current.queue_index&&!indices.has(index)&&options.verifiedAbilities.includes(item.ability_id)){skipped.push({type:'skipped',item,queue_index:index,reason:'verified'});indices.add(index);}});
  if(skipped.length)feedback.skipped=skipped.length;
  let nextIndex=retry?current.queue_index:current.queue_index+1;
  while(indices.has(nextIndex))nextIndex++;
  const next:LearningEntry=nextIndex<meta.queue.length?{type:'item',item:meta.queue[nextIndex],queue_index:nextIndex,plan_index:current.plan_index+1,retries_used:retry?current.retries_used+1:0,hints_used:retry?nextHints:0}:{type:'complete'};
  return {feedback,append:[feedback,...skipped,next]};
}
