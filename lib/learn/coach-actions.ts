import { LearnUserError } from './errors';
import { learnerAttemptHistory } from './runtime';
import 'next/headers';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { recordCoachAction,type CoachPayload } from './record-coach';
import { requireCoach,learnerRow,runtimeConfigs,runtimePack,json,type AttemptRow,type StateRow,type Session } from './runtime';
import { prepareCoachReview,prepareStateOverride } from './coach';
import { emptyEvidence,type State,type Evidence,type RuleContext } from './rules/types';
import { scheduleReviews } from './rules/review';
const stateEnum=z.enum(['unknown','needs_repair','learning','verified','retained','recheck']);
const inputSchema=z.object({kind:z.enum(['diagnostic_gate','state_override','restart_diagnostic','review_attempt']),userId:z.uuid(),requestId:z.uuid(),eventAt:z.iso.datetime(),note:z.string().max(4000),abilityId:z.string().optional(),state:stateEnum.optional(),attemptId:z.uuid().optional(),verdict:z.enum(['correct','incorrect','partial']).optional()});
async function currentState(userId:string,abilityId:string):Promise<State> {
  const result=await createAdminSupabaseClient().from('learn_ability_states').select('*').eq('user_id',userId).eq('ability_id',abilityId).maybeSingle();if(result.error)throw result.error;
  const row=result.data as unknown as StateRow|null;return row?{ability_id:row.ability_id,state:row.state,evidence:row.evidence as unknown as Evidence}:{ability_id:abilityId,state:'unknown',evidence:emptyEvidence()};
}
async function existing(table:'learn_coach_reviews'|'learn_coach_decisions',key:string) {
  const result=await createAdminSupabaseClient().from(table).select('id').eq('idempotency_key',key).maybeSingle();if(result.error)throw result.error;return (result.data as {id:string}|null)?.id;
}
async function reviewChanges(userId:string,before:State,after:State,config:RuleContext) {
  const client=createAdminSupabaseClient();const due=await client.from('learn_review_schedule').select('id').eq('user_id',userId).eq('ability_id',after.ability_id).eq('status','due');if(due.error)throw due.error;
  return {reviews:after.state==='verified'&&before.state!=='verified'?scheduleReviews(after.ability_id,after.evidence.verified_at!,config).result:[],review_updates:(after.state==='recheck'||after.state==='unknown')?(due.data as {id:string}[]).map(row=>({id:row.id,status:'skipped' as const})):[]};
}
export async function runCoachAction(input:unknown) {
  const coach=await requireCoach(),value=inputSchema.parse(input),learner=await learnerRow(value.userId),config=await runtimeConfigs(),client=createAdminSupabaseClient();
  const base:CoachPayload={user_id:value.userId,coach_id:coach.id,idempotency_key:'',kind:'path_override',review:null,decision:null,state:null,event:null,reviews:[],review_updates:[],learner_status:null};
  if(value.kind==='diagnostic_gate') {
    const result=await client.from('learn_sessions').select('*').eq('user_id',value.userId).eq('kind','diagnostic').order('started_at',{ascending:false}).limit(1);if(result.error)throw result.error;
    const session=(result.data as unknown as Session[])[0];if(!session?.ended_at)throw new Error('진단 완료 후 학습을 열 수 있습니다.');
    const key=`diagnostic_gate:${value.userId}:${session.id}`;if(await existing('learn_coach_decisions',key))return '이미 학습을 열었습니다.';
    if(learner.status!=='awaiting_coach')throw new Error('코치 확인 대기 상태가 아닙니다.');
    await recordCoachAction({...base,kind:'diagnostic_gate',idempotency_key:key,decision:{kind:'diagnostic_gate',payload:json({note:value.note,session_id:session.id,rule_version:config.rule_version,trace:{rule:'coach_gate',reasons:['coach_approved'],rule_version:config.rule_version}})},learner_status:'active'});
    return '학습을 열었습니다.';
  }
  const pack=await runtimePack(learner);
  if(value.kind==='review_attempt') {
    if(!value.attemptId||!value.verdict)throw new Error('판정 대상과 결과를 선택해 주세요.');
    const key=`attempt_review:${value.attemptId}:${coach.id}:${value.verdict}`;if(await existing('learn_coach_reviews',key))return '이미 저장한 판정입니다.';
    const result=await client.from('learn_attempts').select('*').eq('id',value.attemptId).eq('user_id',value.userId).single();if(result.error)throw result.error;
    const attempt=result.data as unknown as AttemptRow;if(attempt.result!=='pending_review')throw new Error('코치 검토 대기 시도만 판정할 수 있습니다.');
    const reviewed=await client.from('learn_coach_reviews').select('id').eq('attempt_id',attempt.id).limit(1);if(reviewed.error)throw reviewed.error;if(reviewed.data?.length)throw new Error('이미 코치 판정이 저장되었습니다.');
    const item=await client.from('learn_items').select('variant_group').eq('id',attempt.item_id).eq('version',attempt.item_version).single();if(item.error)throw item.error;
    const attempted_item_ids=(await learnerAttemptHistory(value.userId)).filter(row=>row.id!==attempt.id&&Date.parse(row.created_at)<=Date.parse(attempt.created_at)).map(row=>row.item_id);
    const before=await currentState(value.userId,attempt.ability_id),out=prepareCoachReview(before,{id:attempt.id,item_id:attempt.item_id,item_version:attempt.item_version,ability_id:attempt.ability_id,variant_group:(item.data as {variant_group:string|null}).variant_group,result:attempt.result,usage:attempt.usage,at:new Date().toISOString()},value.verdict,config,attempted_item_ids);
    const after=out.result.state,changes=await reviewChanges(value.userId,before,after,config);
    await recordCoachAction({...base,...changes,kind:'attempt_review',idempotency_key:key,review:{attempt_id:attempt.id,verdict:value.verdict,note:value.note},state:{...after,evidence:json(after.evidence),rule_version:json(out.trace.rule_version)},event:{from_state:before.state,to_state:after.state,reason:JSON.stringify(out.trace),rule_version:json(out.trace.rule_version)}});
    return '코치 판정을 저장했습니다. 원래 자동 판정은 보존됩니다.';
  }
  if(!value.note.trim())throw new Error('변경 사유를 입력해 주세요.');
  const override=async(abilityId:string,target:State['state'],key:string)=>{
    if(await existing('learn_coach_decisions',key))return;
    if(!pack.abilities.some(row=>row.id===abilityId))throw new LearnUserError('학습 팩에 없는 소주제입니다.');
    const before=await currentState(value.userId,abilityId),out=prepareStateOverride(before,target,value.note,new Date().toISOString(),config),after=out.result;
    if(value.kind==='restart_diagnostic')after.evidence=emptyEvidence();
    const changes=await reviewChanges(value.userId,before,after,config);
    await recordCoachAction({...base,...changes,kind:'state_override',idempotency_key:key,decision:{kind:'state_override',payload:json({ability_id:abilityId,state:target,note:value.note,trace:out.trace,rule_version:out.trace.rule_version})},state:{...after,evidence:json(after.evidence),rule_version:json(out.trace.rule_version)},event:{from_state:before.state,to_state:after.state,reason:JSON.stringify({...out.trace,details:{before,after}}),rule_version:json(out.trace.rule_version)}});
  };
  if(value.kind==='state_override') {if(!value.abilityId||!value.state)throw new LearnUserError('소주제와 상태를 선택해 주세요.');await override(value.abilityId,value.state,`state_override:${value.userId}:${value.abilityId}:${value.eventAt}`);return '상태와 사유를 기록했습니다.';}
  const resetKey=`path_override:${value.userId}:${value.requestId}`;
  if(await existing('learn_coach_decisions',resetKey))return '새 진단을 시작할 수 있습니다.';
  // Pause first so a failed reset can be retried without accepting new student submissions.
  await recordCoachAction({...base,idempotency_key:`${resetKey}:pause`,decision:{kind:'path_override',payload:json({action:'pause_for_diagnostic',note:value.note,rule_version:config.rule_version})},learner_status:'paused'});
  const close=await client.from('learn_sessions').update({ended_at:new Date().toISOString()} as never).eq('user_id',value.userId).is('ended_at',null);if(close.error)throw close.error;
  for(const ability of pack.abilities)await override(ability.id,'unknown',`state_override:${value.userId}:${ability.id}:${value.eventAt}`);
  await recordCoachAction({...base,idempotency_key:resetKey,decision:{kind:'path_override',payload:json({action:'restart_diagnostic',note:value.note,rule_version:config.rule_version,trace:{rule:'restart_diagnostic',reasons:['coach_requested'],rule_version:config.rule_version}})},learner_status:'diagnostic_pending'});
  return '기존 기록을 보존하고 새 진단을 허용했습니다.';
}
