import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { requireLearner,runtimeError,type Session } from '@/lib/learn/runtime';
import { learningView } from '@/lib/learn/learning-runtime';
import { diagnosticView } from '@/lib/learn/diagnostic-runtime';
import { readPadDraftRuntime } from '@/lib/learn/pad-runtime';
import { FocusShell } from '@/components/learn/FocusShell';
import { PadClient } from './PadClient';
import { PadEmpty } from './PadEmpty';
export const metadata={title:'입력 패드',robots:{index:false,follow:false}};
export default async function PadPage() {
  if(!await getUser())redirect('/login?returnTo=/learn/pad');
  try {
    const user=await requireLearner();
    const result=await createAdminSupabaseClient().from('learn_sessions').select('*').eq('user_id',user.id).is('ended_at',null).order('started_at',{ascending:false}).limit(1);
    if(result.error)throw result.error;
    const session=(result.data as unknown as Session[])[0];if(!session)return <PadEmpty/>;
    const view=session.kind==='diagnostic'?await diagnosticView():await learningView(session.id);
    if(!view||view.complete)return <PadEmpty/>;
    const saved=await readPadDraftRuntime({sessionId:view.sessionId,planIndex:view.planIndex});
    return <PadClient key={`${view.sessionId}:${view.planIndex}`} {...view} kind={session.kind} current={'queueIndex' in view&&typeof view.queueIndex==='number'?view.queueIndex+1:view.planIndex+1} total={'total' in view&&typeof view.total==='number'?view.total:undefined} initialDraft={saved.draft}/>;
  }catch(error){return <FocusShell title="입력 패드"><p role="alert">{runtimeError(error,'pad')}</p></FocusShell>;}
}
