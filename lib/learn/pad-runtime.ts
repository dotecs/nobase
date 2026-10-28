import 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { requireLearner, sessionRow, type Session } from './runtime';
import { readDiagnosticPlan } from './diagnostic-session';
import { readLearningPlan } from './learning-session';
import { LearnUserError } from './errors';
import { padAddressSchema, savePadSchema, padDraftSchema, type SavedPadDraft, type PadSnapshot } from './pad-draft';

export function padProgress(session:Session) {
  const plan=session.kind==='diagnostic'?readDiagnosticPlan(session.plan):readLearningPlan(session.plan);
  return {plan_index:plan.current.plan_index,ended:!!session.ended_at||plan.complete};
}
export async function savePadDraftRuntime(input:unknown) {
  const user=await requireLearner(),value=savePadSchema.parse(input),session=await sessionRow(value.sessionId,user.id);
  const progress=padProgress(session);
  if(progress.ended||progress.plan_index!==value.planIndex)throw new LearnUserError('진행 상태가 변경되었습니다. 새로고침해 주세요.');
  const path=value.draft.photo_path;
  if(path&&(!path.startsWith(`${user.id}/attempts/`)||path.includes('..')))throw new Error('잘못된 사진 경로');
  const updated_at=new Date().toISOString();
  const result=await createAdminSupabaseClient().from('learn_pad_drafts' as never).upsert({user_id:user.id,session_id:session.id,plan_index:value.planIndex,draft:value.draft,updated_at} as never,{onConflict:'user_id,session_id,plan_index'});
  if(result.error)throw result.error;
  return {updated_at};
}
export async function readPadDraftRuntime(input:unknown):Promise<PadSnapshot> {
  const user=await requireLearner(),value=padAddressSchema.parse(input);
  const session=await sessionRow(value.sessionId,user.id),progress=padProgress(session);
  const result=await createAdminSupabaseClient().from('learn_pad_drafts' as never).select('draft,updated_at').eq('user_id',user.id).eq('session_id',value.sessionId).eq('plan_index',value.planIndex).maybeSingle();
  if(result.error)throw result.error;
  const saved=result.data as SavedPadDraft|null;
  return {...progress,draft:saved?padDraftSchema.parse(saved.draft):null,updated_at:saved?.updated_at??null};
}
