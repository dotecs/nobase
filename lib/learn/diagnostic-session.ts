import type { RuleContext, RulePack, PlannedItem, Attempt } from './rules/types';
import { planDiagnosticBase, nextDiagnosticFollowup, summarizeDiagnostic } from './rules/diagnostic';
import { MINUTE_MS, timestamp, traced } from './rules/types';
import type { RuleItem } from './rules/types';
export type DiagnosticStep = {type:'item'; item:PlannedItem; plan_index:number; next_base_index:number; followups:number};
export type DiagnosticMeta = {type:'diagnostic'; base:PlannedItem[]; config:RuleContext; pack:RulePack; trace:unknown};
export type DiagnosticEntry = DiagnosticMeta | DiagnosticStep | {type:'complete'; trace:unknown};
export function diagnosticPlan(pack:RulePack,items:RuleItem[],config:RuleContext):DiagnosticEntry[] {
  const base=planDiagnosticBase(pack,items,config);
  return [{type:'diagnostic',base:base.result,config,pack,trace:base.trace},{type:'item',item:base.result[0],plan_index:0,next_base_index:1,followups:0}];
}
export function readDiagnosticPlan(input:unknown) {
  if(!Array.isArray(input)||input[0]?.type!=='diagnostic')throw new Error('잘못된 진단 계획');
  const plan=input as DiagnosticEntry[],meta=plan[0] as DiagnosticMeta;
  const steps=plan.filter((entry):entry is DiagnosticStep=>entry.type==='item');
  if(!steps.length)throw new Error('진단 문항이 없습니다.');
  return {meta,steps,current:steps[steps.length-1],complete:plan.some(entry=>entry.type==='complete')};
}
export function advanceDiagnostic(plan:unknown, attempts:Attempt[], incoming:Attempt, items:RuleItem[], startedAt:string, now:string, attempted_item_ids:readonly string[] = []) {
  const {meta,current}=readDiagnosticPlan(plan), expired=timestamp(now)-timestamp(startedAt)>=meta.config.configs.diagnostic.time_limit_min*MINUTE_MS;
  const next=expired?traced({item:meta.base[current.next_base_index]??null,next_base_index:current.next_base_index+1,followups:current.followups},meta.config,['diagnostic'],'diagnostic_timeout',['remaining_base_no_response']):nextDiagnosticFollowup({base:meta.base,next_base_index:current.next_base_index,followups:current.followups,attempted_item_ids:attempts.map(row=>row.item_id),started_at:startedAt,now},incoming,meta.pack,items,meta.config);
  const summary=summarizeDiagnostic([...attempts,incoming],meta.pack,meta.config,attempted_item_ids);
  const append:DiagnosticEntry=next.result.item?{type:'item',item:next.result.item,plan_index:current.plan_index+1,next_base_index:next.result.next_base_index,followups:next.result.followups}:{type:'complete',trace:summary.trace};
  return {append,summary,trace:next.trace,learner_status:append.type==='complete'?(meta.config.configs.gate.coach_gate_after_diagnostic?'awaiting_coach' as const:'active' as const):null};
}
