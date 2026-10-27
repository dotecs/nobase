import { LearnUserError } from './errors';
import 'next/headers';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { requireLearner,learnerRow,runtimePack,runtimeConfigs,sessionRow,sessionAttempts,json,stableId,type Session,type StateRow,type AttemptRow } from './runtime';
import { loadLearnItems,toStudentItem,type LearnItem } from './items';
import { planSession } from './rules/recommend';
import { applyAttempt } from './rules/states';
import { scheduleReviews,markReview,type ReviewSchedule } from './rules/review';
import { emptyEvidence,MINUTE_MS,type State,type Evidence,type Attempt,type PlannedItem,type RuleContext } from './rules/types';
import { gradeAttempt } from './grade';
import { recordAttempt } from './record';
import { learningPlan,readLearningPlan,learningOutcome } from './learning-session';

export async function ownRows<T>(table:'learn_attempts'|'learn_ability_states'|'learn_review_schedule'|'learn_ability_state_events'|'learn_sessions',userId:string):Promise<T[]> {
  const client=createAdminSupabaseClient(),rows:T[]=[],size=500;
  for(let offset=0;;offset+=size){const result=await client.from(table).select('*').eq('user_id',userId).order(table==='learn_ability_states'?'ability_id':'id').range(offset,offset+size-1);if(result.error)throw result.error;const batch=result.data as unknown as T[];rows.push(...batch);if(batch.length<size)return rows;}
}
export async function activeLearner() {const user=await requireLearner(),learner=await learnerRow(user.id);if(learner.status!=='active')throw new LearnUserError('코치 확인 후 학습할 수 있습니다.');return {user,learner};}
export function historyAttempts(rows:AttemptRow[],items:LearnItem[]):Attempt[] {return rows.map(row=>({id:row.id,item_id:row.item_id,item_version:row.item_version,ability_id:row.ability_id,variant_group:items.find(item=>item.id===row.item_id)?.variant_group??row.item_id,result:row.result,usage:row.usage,at:row.created_at,session_id:row.session_id}));}
export async function openLearningSession(userId:string) {
  const result=await createAdminSupabaseClient().from('learn_sessions').select('*').eq('user_id',userId).in('kind',['practice','review']).is('ended_at',null).order('started_at',{ascending:false}).limit(1);if(result.error)throw result.error;return (result.data as unknown as Session[])[0]??null;
}
export async function createLearningSession(userId:string,kind:'practice'|'review',queue:PlannedItem[],config:RuleContext,packId:string,trace:unknown) {
  const existing=await openLearningSession(userId);if(existing)return existing.id;
  const id=randomUUID(),result=await createAdminSupabaseClient().from('learn_sessions').insert({id,user_id:userId,kind,plan:json(learningPlan(queue,config,packId,trace)),rule_version:json(config.rule_version)} as never);
  if(result.error){if(result.error.code==='23505'){const open=await openLearningSession(userId);if(open)return open.id;}throw result.error;}return id;
}
export async function startLearningRuntime() {
  const {user,learner}=await activeLearner(),existing=await openLearningSession(user.id);if(existing)return {id:existing.id};
  const pack=await runtimePack(learner),config=await runtimeConfigs(),items=await loadLearnItems(pack.abilities.map(row=>row.id));
  const [states,attempts,reviews]=await Promise.all([ownRows<StateRow>('learn_ability_states',user.id),ownRows<AttemptRow>('learn_attempts',user.id),ownRows<ReviewSchedule>('learn_review_schedule',user.id)]);
  const plan=planSession({goal_id:learner.goal_id,status:learner.status,now:new Date().toISOString(),due_reviews:reviews},states.map(row=>({...row,evidence:row.evidence as unknown as Evidence})),pack,items,historyAttempts(attempts,items),config);
  if(!plan.result.items.length)return {empty_reason:plan.result.empty_reason};
  return {id:await createLearningSession(user.id,'practice',plan.result.items,config,learner.pack_id,plan.trace)};
}
export async function closeLearningSession(session:Session,timedOut=false) {
  const plan=readLearningPlan(session.plan);if(!plan.complete&&!timedOut)return;
  const client=createAdminSupabaseClient(),attempts=await sessionAttempts(session.id,session.user_id);
  const ids=new Set(attempts.map(row=>row.id)),[events,reviews]=await Promise.all([ownRows<{attempt_id:string|null;ability_id:string;from_state:string;to_state:string}>('learn_ability_state_events',session.user_id),ownRows<ReviewSchedule>('learn_review_schedule',session.user_id)]);
  const summary={correct:attempts.filter(row=>row.result==='correct_independent'||row.result==='correct_assisted').length,attempts:attempts.length,newly_verified:[...new Set(events.filter(row=>row.attempt_id&&ids.has(row.attempt_id)&&row.to_state==='verified'&&row.from_state!=='verified').map(row=>row.ability_id))],next_review_at:reviews.filter(row=>row.status==='due').map(row=>row.due_at).sort()[0]??null,timed_out:timedOut,rule_version:plan.meta.config.rule_version};
  const result=await client.from('learn_sessions').update({ended_at:new Date().toISOString(),summary:json(summary)} as never).eq('id',session.id).eq('user_id',session.user_id).is('ended_at',null);if(result.error)throw result.error;
}
export async function expireLearningRuntime(id:string) {const {user}=await activeLearner();z.uuid().parse(id);const session=await sessionRow(id,user.id),plan=readLearningPlan(session.plan);if(Date.now()-Date.parse(session.started_at)>=plan.meta.config.configs.session.max_minutes*MINUTE_MS)await closeLearningSession(session,true);}
async function validatePhoto(userId:string,path:string|null,required:boolean) {
  if(required&&!path)throw new LearnUserError('풀이 사진을 첨부해 주세요.');if(!path)return;
  if(!path.startsWith(`${userId}/attempts/`)||path.includes('..'))throw new Error('잘못된 사진 경로');
  const slash=path.lastIndexOf('/'),result=await createAdminSupabaseClient().storage.from('learn-evidence').list(path.slice(0,slash),{search:path.slice(slash+1)});
  if(result.error||!result.data?.some(row=>row.name===path.slice(slash+1)))throw new LearnUserError('사진 업로드를 확인해 주세요.');
}
export async function submitLearningRuntime(input:unknown) {
  const {user}=await activeLearner(),value=z.object({sessionId:z.uuid(),itemId:z.string(),planIndex:z.number().int().nonnegative(),answer:z.union([z.string().max(4000),z.array(z.string().max(100)).max(100)]),photoPath:z.string().max(1000).nullable(),durationMs:z.number().int().nonnegative().max(2147483647).nullable()}).parse(input);
  const session=await sessionRow(value.sessionId,user.id),plan=readLearningPlan(session.plan),key=`${session.id}:${value.itemId}:${value.planIndex}`;
  const attempts=await sessionAttempts(session.id,user.id);if(attempts.some(row=>row.idempotency_key===key)){await closeLearningSession(session);return;}
  if(session.ended_at||plan.complete)throw new LearnUserError('종료된 세션입니다.');
  if(Date.now()-Date.parse(session.started_at)>=plan.meta.config.configs.session.max_minutes*MINUTE_MS){await closeLearningSession(session,true);return;}
  if(plan.current.plan_index!==value.planIndex||plan.current.item.item_id!==value.itemId)throw new LearnUserError('진행 상태가 변경되었습니다. 새로고침해 주세요.');
  const client=createAdminSupabaseClient(),itemResult=await client.from('learn_items').select('*').eq('id',value.itemId).eq('version',plan.current.item.item_version).in('status',['reviewed','live']).single();if(itemResult.error)throw itemResult.error;
  const item=itemResult.data as unknown as LearnItem,config=plan.meta.config;
  const usage=plan.current.item.kind==='review'?'review':item.usage;
  await validatePhoto(user.id,value.photoPath,config.configs.evidence.photo_required_usages.includes(usage)||item.answer_type==='photo');
  const solver=config.configs.solvers.by_pack[plan.meta.pack_id]??config.configs.solvers.default;
  const grade=gradeAttempt(item,value.answer,Math.max(plan.current.hints_used,plan.current.retries_used),solver,config);if(grade.result==='input_issue')throw new LearnUserError('답 입력 형식을 확인해 주세요.');
  const stateResult=await client.from('learn_ability_states').select('*').eq('user_id',user.id).eq('ability_id',item.ability_id).maybeSingle();if(stateResult.error)throw stateResult.error;
  const row=stateResult.data as unknown as StateRow|null,before:State=row?{ability_id:row.ability_id,state:row.state,evidence:row.evidence as unknown as Evidence}:{ability_id:item.ability_id,state:'unknown',evidence:emptyEvidence()};
  const attempt:Attempt={id:stableId(key),item_id:item.id,item_version:item.version,ability_id:item.ability_id,variant_group:item.variant_group,result:grade.result,usage,at:new Date().toISOString()};
  const history=await ownRows<AttemptRow>('learn_attempts',user.id);
  const transition=applyAttempt(before,attempt,config,history.map(row=>row.item_id));let after=transition.result.state;
  const schedules=await ownRows<ReviewSchedule>('learn_review_schedule',user.id);
  const reviewed=usage==='review'?markReview(schedules,attempt,config):null;
  if(reviewed?.result.state){after={...after,state:reviewed.result.state,evidence:{...after.evidence,...reviewed.result.evidence_reset}};}
  // A failed review has already skipped its schedules; retry feedback must not undo recheck.
  if(usage==='review'&&plan.current.retries_used>0&&before.state==='recheck'&&grade.result==='incorrect')after={...after,state:'recheck'};
  const reviews=after.state==='verified'&&before.state!=='verified'?scheduleReviews(item.ability_id,after.evidence.verified_at!,config).result:[];
  const updates=schedules.flatMap(schedule=>{
    const changed=reviewed?.result.schedule.find(row=>row.id===schedule.id);
    const status=after.state==='recheck'&&schedule.ability_id===item.ability_id&&schedule.status==='due'?'skipped':changed?.status??schedule.status;
    return schedule.id&&status!==schedule.status&&status!=='due'?[{id:schedule.id,status}]:[];
  });
  const outcome=learningOutcome(session.plan,item,grade.result);
  await recordAttempt({user_id:user.id,session_id:session.id,idempotency_key:key,attempt:{item_id:item.id,item_version:item.version,ability_id:item.ability_id,usage,answer_input:json(value.answer),result:grade.result,auto_grade:json({...grade.auto_grade,state_trace:transition.trace,review_trace:reviewed?.trace??null}),hints_used:plan.current.hints_used,photo_path:value.photoPath,duration_ms:value.durationMs,rule_version:json(config.rule_version)},state:{...after,evidence:json(after.evidence),rule_version:json(config.rule_version)},event:{from_state:before.state,to_state:after.state,reason:JSON.stringify({state:transition.trace,review:reviewed?.trace??null,before,after}),rule_version:json(config.rule_version)},reviews,review_updates:updates,session_plan_append:json(outcome.append),learner_status:null});
  await closeLearningSession(await sessionRow(session.id,user.id));
}
export async function learningView(id:string) {
  const {user}=await activeLearner();z.uuid().parse(id);let session=await sessionRow(id,user.id);const plan=readLearningPlan(session.plan);
  const deadline=new Date(Date.parse(session.started_at)+plan.meta.config.configs.session.max_minutes*MINUTE_MS).toISOString();
  if(!session.ended_at&&(plan.complete||Date.now()>=Date.parse(deadline))){await closeLearningSession(session,!plan.complete);session=await sessionRow(id,user.id);}
  if(session.ended_at)return {complete:true as const,summary:session.summary,feedback:plan.feedback};
  const result=await createAdminSupabaseClient().from('learn_items').select('*').eq('id',plan.current.item.item_id).eq('version',plan.current.item.item_version).in('status',['reviewed','live']).single();if(result.error)throw result.error;
  const item=result.data as unknown as LearnItem,usage=plan.current.item.kind==='review'?'review':item.usage;
  return {complete:false as const,userId:user.id,sessionId:id,planIndex:plan.current.plan_index,queueIndex:plan.current.queue_index,total:plan.meta.queue.length,item:toStudentItem(item),deadline,photo_required:plan.meta.config.configs.evidence.photo_required_usages.includes(usage)||item.answer_type==='photo',feedback:plan.feedback};
}
