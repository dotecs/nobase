import { LearnUserError } from './errors';
import type { Attempt, RuleContext, State, RulePack, RuleItem } from './rules/types';
import { resetVerification, traced } from './rules/types';
import { applyAttempt } from './rules/states';
import { planSession, type SessionLearner } from './rules/recommend';
export type CoachVerdict='correct'|'incorrect'|'partial';
export function prepareCoachReview(state:State,attempt:Attempt,verdict:CoachVerdict,config:RuleContext<'evidence'>,attempted_item_ids:readonly string[]) {
  const mapped=config.configs.evidence.coach_verdict_map[verdict];
  if(!mapped)throw new Error('코치 판정 매핑이 없습니다.');
  const result=applyAttempt(state,{...attempt,result:mapped},config,attempted_item_ids);
  return {...result,mapped};
}
export function prepareStateOverride(state:State,target:State['state'],reason:string,now:string,config:RuleContext<'evidence'>) {
  if(!reason.trim())throw new LearnUserError('상태 변경 사유를 입력해 주세요.');
  const next=structuredClone(state);next.state=target;
  if(target==='recheck'||target==='unknown')next.evidence=resetVerification(next.evidence);
  if(target==='verified')next.evidence.verified_at=now;
  return traced(next,config,['evidence'],'coach_override',[reason.trim()],{before:state,after:next});
}
export function previewSessions(learner:SessionLearner,states:State[],pack:RulePack,items:RuleItem[],history:Attempt[],config:RuleContext<'recommendation'|'session'>) {
  const first=planSession({...learner,status:'active'},states,pack,items,history,config);
  const exposed=first.result.items.map((item,index)=>({id:`preview-${index}`,item_id:item.item_id,item_version:item.item_version,ability_id:item.ability_id,variant_group:item.variant_group,result:'pending_review' as const,usage:item.kind,at:learner.now}));
  const reviews=new Set(first.result.items.filter(row=>row.kind==='review').map(row=>row.ability_id));
  const second=planSession({...learner,status:'active',due_reviews:learner.due_reviews.filter(row=>!reviews.has(row.ability_id))},states,pack,items,[...history,...exposed],config);
  return [first,second];
}
