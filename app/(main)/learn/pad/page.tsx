import type { Profile } from '@/lib/database.types';
import type { ReactNode } from 'react';
import { AdminLearnNotice } from '@/components/learn/AdminLearnNotice';
import { PadAccount } from '@/components/learn/PadAccount';
import { hasLearnAccess } from '@/lib/learn/access';
import { pendingPhotoSessions,sessionPhotos } from '@/lib/learn/session-photos';
import { PadPhotoStage } from '@/components/learn/PadPhotoStage';
import { sessionRow } from '@/lib/learn/runtime';
import { readDiagnosticPlan } from '@/lib/learn/diagnostic-session';
import { redirect } from 'next/navigation';
import { getUser,getProfile } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { requireLearner,runtimeError,type Session } from '@/lib/learn/runtime';
import { learningView } from '@/lib/learn/learning-runtime';
import { diagnosticView } from '@/lib/learn/diagnostic-runtime';
import { readPadDraftRuntime } from '@/lib/learn/pad-runtime';
import { FocusShell } from '@/components/learn/FocusShell';
import { PadClient } from './PadClient';
import { PadEmpty } from './PadEmpty';
export const metadata={title:'입력 패드',robots:{index:false,follow:false}};
export default async function PadPage({searchParams}:{searchParams:Promise<{session?:string}>}) {
  const signedUser=await getUser();if(!signedUser)redirect('/login?returnTo=/learn/pad');
  const profile=await getProfile() as Profile|null;
  const wrap=(content:ReactNode)=><><PadAccount name={profile?.name||signedUser.email||'사용자'}/>{content}</>;

  try {
    const access=await hasLearnAccess(signedUser.id);
    if(access.reason==='admin'&&!(await hasLearnAccess(signedUser.id,{requireEnrollment:true})).granted)return wrap(<FocusShell title="입력 패드"><AdminLearnNotice/></FocusShell>);
    const user=await requireLearner();
    const photoStage=async(session:Session)=>wrap(<PadPhotoStage sessionId={session.id} userId={user.id} kind={session.kind} photos={await sessionPhotos(session.id)}/>);
    const pinned=(await searchParams).session;if(pinned){const saved=await sessionRow(pinned,user.id);if(saved.ended_at)return photoStage(saved);}

    const result=await createAdminSupabaseClient().from('learn_sessions').select('*').eq('user_id',user.id).is('ended_at',null).order('started_at',{ascending:false}).limit(1);
    if(result.error)throw result.error;
    const session=(result.data as unknown as Session[])[0];if(!session){const pending=await pendingPhotoSessions(user.id),photoSession=pending.diagnosticPending??pending.learning;return photoSession?photoStage(photoSession):wrap(<PadEmpty/>);}
    const view=session.kind==='diagnostic'?await diagnosticView():await learningView(session.id);
    if(!view)return wrap(<PadEmpty/>);if(view.complete)return photoStage(await sessionRow(session.id,user.id));
    const saved=await readPadDraftRuntime({sessionId:view.sessionId,planIndex:view.planIndex});
    const diagnostic=session.kind==='diagnostic'?readDiagnosticPlan(session.plan):null;
    const total=diagnostic?diagnostic.meta.base.length+diagnostic.current.followups:'total' in view&&typeof view.total==='number'?view.total:undefined;
    return wrap(<PadClient key={`${view.sessionId}:${view.planIndex}`} {...view} kind={session.kind} current={'queueIndex' in view&&typeof view.queueIndex==='number'?view.queueIndex+1:view.planIndex+1} total={total} initialDraft={saved.draft}/>);
  }catch(error){return wrap(<FocusShell title="입력 패드"><p role="alert">{runtimeError(error,'pad')}</p></FocusShell>);}
}
