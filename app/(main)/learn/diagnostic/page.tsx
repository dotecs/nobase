import { AdminLearnNotice } from '@/components/learn/AdminLearnNotice';
import { pendingPhotoSessions,sessionPhotos } from '@/lib/learn/session-photos';
import { SessionPhotoPanel } from '@/components/learn/SessionPhotoPanel';
import { redirect } from 'next/navigation';
import Button from '@/components/Button/Button';
import { getUser } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import { diagnosticView } from '@/lib/learn/diagnostic-runtime';
import { runtimeError } from '@/lib/learn/runtime';
import { FocusShell } from '@/components/learn/FocusShell';
import { DiagnosticClient } from './DiagnosticClient';
import { DiagnosticFinish } from './DiagnosticState';
export default async function DiagnosticPage() {
  const user=await getUser();if(!user)redirect('/login?returnTo=/learn/diagnostic');
  const access=await hasLearnAccess(user.id);if(!access.granted)return <FocusShell title="출발점 진단" tone="diagnostic"><p>코칭 과정 등록 후 이용할 수 있습니다.</p></FocusShell>;
  if(access.reason==='admin'&&!(await hasLearnAccess(user.id,{requireEnrollment:true})).granted)return <FocusShell title="출발점 진단" tone="diagnostic"><AdminLearnNotice/></FocusShell>;
  try {const view=await diagnosticView();if(view?.complete){const {diagnostic}=await pendingPhotoSessions(user.id);if(!diagnostic)throw new Error('진단 세션이 없습니다.');return <FocusShell title="출발점 진단" diagnostic><SessionPhotoPanel userId={user.id} sessionId={diagnostic.id} kind="diagnostic" initialPhotos={await sessionPhotos(diagnostic.id)}/></FocusShell>;}return !view?<FocusShell title="출발점 진단" tone="diagnostic"><DiagnosticFinish complete={false}/></FocusShell>:<DiagnosticClient key={`${view.sessionId}:${view.planIndex}`} {...view}/>;}
  catch(error){return <FocusShell title="출발점 진단" tone="diagnostic"><p role="alert">{runtimeError(error, 'app/(main)/learn/diagnostic/page.tsx')}</p><Button href="/learn" size="lg" fullWidth>학습 홈으로</Button></FocusShell>;}
}
