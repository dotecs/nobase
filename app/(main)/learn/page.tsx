import { AdminLearnNotice } from '@/components/learn/AdminLearnNotice';
import { pendingPhotoSessions } from '@/lib/learn/session-photos';
import { SessionPhotoReminder } from '@/components/learn/SessionPhotoReminder';
import { PadModeCard } from '@/components/learn/PadModeCard';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Header from '@/components/Header/Header';
import { getUser, getProfile } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import type { Profile } from '@/lib/database.types';
import styles from './learn.module.css';
import { learnerRow, runtimeConfigs, runtimeError } from '@/lib/learn/runtime';
import { dueReviewAbilities } from '@/lib/learn/review-runtime';
import { readLearningPlan } from '@/lib/learn/learning-session';
import { openLearningSession,recommendLearningSession } from '@/lib/learn/learning-runtime';
import { homeSummary } from '@/lib/learn/home-runtime';
import { HomePanel } from './HomePanel';

export const metadata: Metadata = { title: '뿌리 깊은 수학 코칭', robots: { index: false, follow: false } };

export default async function LearnPage() {
  const user = await getUser();
  if (!user) redirect('/login?returnTo=/learn');
  const [access, profileData] = await Promise.all([hasLearnAccess(user.id), getProfile()]);
  const profile = profileData as Profile | null;
  let content;
  if(!access.granted) content=<section className={styles.card}><h2>등록 후 시작할 수 있어요</h2><p>코칭 과정 등록 후 이용할 수 있습니다.</p></section>;
  else if(access.reason==='admin'&&!(await hasLearnAccess(user.id,{requireEnrollment:true})).granted)content=<AdminLearnNotice/>;
  else try {
    const learner=await learnerRow(user.id,true),config=await runtimeConfigs();
    const [summary,due,open]=learner.status==='active'?await Promise.all([homeSummary(learner),dueReviewAbilities(user.id),openLearningSession(user.id)]):[undefined,[],null];
    const plannedCount=open?readLearningPlan(open.plan).meta.remaining:learner.status==='active'?(await recommendLearningSession(user.id,learner,config)).result.items.length:0;
    const padSession=await createAdminSupabaseClient().from('learn_sessions').select('id').eq('user_id',user.id).is('ended_at',null).limit(1);if(padSession.error)throw padSession.error;
    const photoPending=await pendingPhotoSessions(user.id);
    const padEntry=<PadModeCard hasOpenSession={!!padSession.data?.length||!!photoPending.diagnosticPending||!!photoPending.learning}/>;
    content=<>{!(learner.status==='awaiting_coach'&&photoPending.diagnosticPending)&&padEntry}<HomePanel diagnosticPhotoPending={!!photoPending.diagnosticPending} status={learner.status} minutes={config.configs.diagnostic.time_limit_min} photoRequired={(config.configs.evidence.session_photo??{diagnostic:'required',learning:'optional',review:'optional'}).diagnostic==='required'} summary={summary} due={due.length} itemsPerSession={plannedCount} maxMinutes={config.configs.session.max_minutes} openSessionId={open?.id}/>{learner.status==='awaiting_coach'&&photoPending.diagnosticPending&&padEntry}{photoPending.learning&&<SessionPhotoReminder sessionId={photoPending.learning.id}/>}</>;
  }catch(error){content=<p role="alert">{runtimeError(error, 'app/(main)/learn/page.tsx')}</p>;}
  return <>
    <Header isLoggedIn userName={profile?.name || user.email} userRole={profile?.role} />
    <main className={styles.page}><h1>뿌리 깊은 수학 코칭</h1>
      {content}
    </main>
  </>;
}
