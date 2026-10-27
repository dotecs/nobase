import { LearnUserError } from './errors';
import { learnerAttemptHistory } from './runtime';
import 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { z } from 'zod';
import { loadLearnItems, toStudentItem, type LearnItem } from './items';
import { gradeAttempt } from './grade';
import { recordAttempt } from './record';
import { diagnosticPlan, readDiagnosticPlan, advanceDiagnostic } from './diagnostic-session';
import { emptyEvidence, MINUTE_MS, type Attempt } from './rules/types';
import { requireLearner, learnerRow, runtimePack, runtimeConfigs, sessionRow, sessionAttempts, stableId, json, type StateRow, type Session, type AttemptRow } from './runtime';

export async function startDiagnosticRuntime() {
  const user=await requireLearner(), learner=await learnerRow(user.id,true), client=createAdminSupabaseClient();
  if(!['diagnostic_pending','diagnostic_in_progress'].includes(learner.status))throw new LearnUserError('현재는 진단을 시작할 수 없습니다.');
  const reset=await client.from('learn_coach_decisions').select('id').eq('user_id',user.id).contains('payload',{action:'restart_diagnostic'}).order('created_at',{ascending:false}).limit(1);
  if(reset.error)throw reset.error;
  const resetId=(reset.data as {id:string}[]|null)?.[0]?.id??'initial';
  const id=stableId(`${user.id}:diagnostic:${resetId}`), pack=await runtimePack(learner), config=await runtimeConfigs(), items=await loadLearnItems(pack.abilities.map(row=>row.id));
  const plan=diagnosticPlan(pack,items,config);
  const insert=await client.from('learn_sessions').upsert({id,user_id:user.id,kind:'diagnostic',plan:json(plan),rule_version:json(config.rule_version)} as never,{onConflict:'id',ignoreDuplicates:true});if(insert.error)throw insert.error;
  const states=pack.abilities.map(row=>({user_id:user.id,ability_id:row.id,state:'unknown',evidence:emptyEvidence(),rule_version:config.rule_version}));
  const init=await client.from('learn_ability_states').upsert(states as never,{onConflict:'user_id,ability_id',ignoreDuplicates:true});if(init.error)throw init.error;
  const update=await client.from('learn_learners').update({status:'diagnostic_in_progress'} as never).eq('user_id',user.id).eq('status','diagnostic_pending');if(update.error)throw update.error;
  return id;
}
async function finalize(session:Session) {
  const plan=readDiagnosticPlan(session.plan);if(!plan.complete)return;
  const client=createAdminSupabaseClient(), attempts=await sessionAttempts(session.id,session.user_id);
  const result=await client.from('learn_sessions').update({ended_at:session.ended_at??new Date().toISOString(),summary:json({attempts:attempts.length,rule_version:plan.meta.config.rule_version})} as never).eq('id',session.id).eq('user_id',session.user_id).is('ended_at',null);if(result.error)throw result.error;
}
function asAttempt(row:AttemptRow, session:Session):Attempt {
  const step=readDiagnosticPlan(session.plan).steps.find(step=>step.item.item_id===row.item_id&&step.item.item_version===row.item_version);
  return {id:row.id,item_id:row.item_id,item_version:row.item_version,ability_id:row.ability_id,variant_group:step?.item.variant_group??row.item_id,result:row.result,usage:row.usage,at:row.created_at,session_id:row.session_id};
}
async function recordCurrent(session:Session,input:unknown,photoPath:string|null,duration:number|null,expired:boolean) {
  const {meta,current,complete}=readDiagnosticPlan(session.plan);if(complete)return;
  const client=createAdminSupabaseClient(), key=`${session.id}:${current.item.item_id}:${current.plan_index}`;
  const prior=await sessionAttempts(session.id,session.user_id);
  if(prior.some(row=>row.idempotency_key===key))return;
  const itemResult=await client.from('learn_items').select('*').eq('id',current.item.item_id).eq('version',current.item.item_version).in('status',['reviewed','live']).single();if(itemResult.error)throw itemResult.error;
  const item=itemResult.data as unknown as LearnItem;
  if(item.ability_id!==current.item.ability_id)throw new Error('진단 문항이 일치하지 않습니다.');
  if(!expired) {
    const required=meta.config.configs.evidence.photo_required_usages.includes(current.item.kind)||item.answer_type==='photo';
    if(required&&!photoPath)throw new LearnUserError('풀이 사진을 첨부해 주세요.');
    if(photoPath) {
      if(!photoPath.startsWith(`${session.user_id}/attempts/`)||photoPath.includes('..'))throw new Error('잘못된 사진 경로');
      const slash=photoPath.lastIndexOf('/'), listing=await client.storage.from('learn-evidence').list(photoPath.slice(0,slash),{search:photoPath.slice(slash+1)});
      if(listing.error||!listing.data?.some(file=>file.name===photoPath.slice(slash+1)))throw new LearnUserError('사진 업로드를 확인해 주세요.');
    }
  }
  const learner=await learnerRow(session.user_id), solver=meta.config.configs.solvers.by_pack[learner.pack_id]??meta.config.configs.solvers.default;
  const grade=expired?{result:'no_response' as const,auto_grade:{solver,trace:{rule:'diagnostic_timeout',rule_version:{diagnostic:meta.config.rule_version.diagnostic}}}}:gradeAttempt(item,input,0,solver,meta.config);
  if(grade.result==='input_issue')throw new LearnUserError('답 입력 형식을 확인해 주세요.');
  const now=new Date().toISOString(), incoming:Attempt={id:stableId(key),item_id:item.id,item_version:item.version,ability_id:item.ability_id,variant_group:item.variant_group,result:grade.result,usage:'diagnostic',at:now,session_id:session.id};
  const items=await loadLearnItems(meta.pack.abilities.map(row=>row.id));
  const attempted_item_ids=(await learnerAttemptHistory(session.user_id)).filter(row=>row.session_id!==session.id).map(row=>row.item_id);
  const next=advanceDiagnostic(session.plan,prior.map(row=>asAttempt(row,session)),incoming,items,session.started_at,now,attempted_item_ids);
  const state=next.summary.result.find(row=>row.ability_id===item.ability_id)!;
  const old=await client.from('learn_ability_states').select('*').eq('user_id',session.user_id).eq('ability_id',item.ability_id).single();if(old.error)throw old.error;
  const previous=old.data as unknown as StateRow;
  await recordAttempt({session_id:session.id,user_id:session.user_id,idempotency_key:key,
    attempt:{item_id:item.id,item_version:item.version,ability_id:item.ability_id,usage:'diagnostic',answer_input:json(expired?'':input),result:grade.result,auto_grade:json({...grade.auto_grade,diagnostic_trace:next.trace}),hints_used:0,photo_path:expired?null:photoPath,duration_ms:duration,rule_version:json(meta.config.rule_version)},
    state:{...state,evidence:json(state.evidence),rule_version:json(next.summary.trace.rule_version)},
    event:previous.state===state.state?null:{from_state:previous.state,to_state:state.state,reason:JSON.stringify({trace:next.summary.trace,before:previous.evidence,after:state.evidence}),rule_version:json(next.summary.trace.rule_version)},
    reviews:[],review_updates:[],session_plan_append:json([next.append]),learner_status:next.learner_status});
}
export async function expireDiagnosticRuntime(id:string) {
  const user=await requireLearner();z.uuid().parse(id);
  let session=await sessionRow(id,user.id);
  if((await learnerRow(user.id)).status!=='diagnostic_in_progress'){if(readDiagnosticPlan(session.plan).complete)await finalize(session);return;}
  if(session.kind!=='diagnostic')throw new Error('진단 세션이 아닙니다.');
  const {meta}=readDiagnosticPlan(session.plan);
  if(Date.now()-Date.parse(session.started_at)<meta.config.configs.diagnostic.time_limit_min*MINUTE_MS)return;
  while(!readDiagnosticPlan(session.plan).complete&&!session.ended_at) {await recordCurrent(session,'',null,null,true);session=await sessionRow(id,user.id);}
  await finalize(session);
}
export async function submitDiagnosticRuntime(input:unknown) {
  const user=await requireLearner();
  const value=z.object({sessionId:z.uuid(),itemId:z.string().min(1),planIndex:z.number().int().nonnegative(),answer:z.union([z.string().max(4000),z.array(z.string().max(100)).max(100)]),photoPath:z.string().max(1000).nullable(),durationMs:z.number().int().nonnegative().max(2147483647).nullable()}).parse(input);
  const session=await sessionRow(value.sessionId,user.id);if(session.kind!=='diagnostic')throw new Error('진단 세션이 아닙니다.');
  const plan=readDiagnosticPlan(session.plan), attempts=await sessionAttempts(session.id,user.id);
  if(attempts.some(row=>row.idempotency_key===`${session.id}:${value.itemId}:${value.planIndex}`)){await finalize(session);return;}
  if((await learnerRow(user.id)).status!=='diagnostic_in_progress')throw new LearnUserError('현재 진단 제출이 허용되지 않습니다.');
  if(plan.complete||session.ended_at)throw new LearnUserError('종료된 진단입니다.');
  if(plan.current.item.item_id!==value.itemId||plan.current.plan_index!==value.planIndex)throw new LearnUserError('진단 진행 상태가 변경되었습니다. 새로고침해 주세요.');
  if(Date.now()-Date.parse(session.started_at)>=plan.meta.config.configs.diagnostic.time_limit_min*MINUTE_MS){await expireDiagnosticRuntime(session.id);return;}
  await recordCurrent(session,value.answer,value.photoPath,value.durationMs,false);
  await finalize(await sessionRow(session.id,user.id));
}
export async function diagnosticView() {
  const user=await requireLearner(), client=createAdminSupabaseClient();
  const result=await client.from('learn_sessions').select('*').eq('user_id',user.id).eq('kind','diagnostic').order('started_at',{ascending:false}).limit(1);if(result.error)throw result.error;
  const session=(result.data as unknown as Session[])[0];if(!session)return null;
  const {meta,current,complete}=readDiagnosticPlan(session.plan);
  if(complete){await finalize(session);return {complete:true as const};}
  if(session.ended_at)return null;
  const itemResult=await client.from('learn_items').select('*').eq('id',current.item.item_id).eq('version',current.item.item_version).in('status',['reviewed','live']).single();if(itemResult.error)throw itemResult.error;
  const item=itemResult.data as unknown as LearnItem;
  return {complete:false as const,userId:user.id,sessionId:session.id,planIndex:current.plan_index,item:toStudentItem(item),photo_required:meta.config.configs.evidence.photo_required_usages.includes('diagnostic')||item.answer_type==='photo',deadline:new Date(Date.parse(session.started_at)+meta.config.configs.diagnostic.time_limit_min*MINUTE_MS).toISOString()};
}
