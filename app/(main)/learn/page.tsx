import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components';
import { getUser, getProfile } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import type { Profile } from '@/lib/database.types';
import styles from './learn.module.css';
import { learnerRow, runtimeConfigs, runtimeError } from '@/lib/learn/runtime';
import { dueReviewAbilities } from '@/lib/learn/review-runtime';
import { homeSummary } from '@/lib/learn/home-runtime';
import { HomePanel } from './HomePanel';

export const metadata: Metadata = { title: '뿌리 깊은 수학 코칭', robots: { index: false, follow: false } };

export default async function LearnPage() {
  const user = await getUser();
  if (!user) redirect('/login?returnTo=/learn');
  const [access, profileData] = await Promise.all([hasLearnAccess(user.id), getProfile()]);
  const profile = profileData as Profile | null;
  let content;
  if(!access.granted) content=<p>코칭 과정 등록 후 이용할 수 있습니다.</p>;
  else try {
    const learner=await learnerRow(user.id,true),config=await runtimeConfigs();
    const [summary,due]=learner.status==='active'?await Promise.all([homeSummary(learner),dueReviewAbilities(user.id)]):[undefined,[]];
    content=<HomePanel status={learner.status} minutes={config.configs.diagnostic.time_limit_min} photoRequired={config.configs.evidence.photo_required_usages.includes('diagnostic')} summary={summary} due={due.length}/>;
  }catch(error){content=<p role="alert">{runtimeError(error)}</p>;}
  return <>
    <Header isLoggedIn userName={profile?.name || user.email} userRole={profile?.role} />
    <main className={styles.page}><h1>뿌리 깊은 수학 코칭</h1>
      {content}
    </main>
  </>;
}
