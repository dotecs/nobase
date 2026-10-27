import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components';
import { getUser, getProfile } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import type { Profile } from '@/lib/database.types';
import styles from './learn.module.css';
import Link from 'next/link';
import { learnerRow, runtimeConfigs, runtimeError } from '@/lib/learn/runtime';
import { StartDiagnostic } from './StartDiagnostic';

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
    content=learner.status==='diagnostic_pending'?<section className={styles.card}><h2>나의 출발점 찾기</h2><p>약 {config.configs.diagnostic.time_limit_min}분 동안 문제를 풀어 주세요. {config.configs.evidence.photo_required_usages.includes('diagnostic')?'풀이 사진이 필요합니다.':'풀이 사진은 선택입니다.'}</p><StartDiagnostic /></section>
      :learner.status==='diagnostic_in_progress'?<section className={styles.card}><h2>진단이 진행 중입니다</h2><Link className={styles.button} href="/learn/diagnostic">진단 이어하기</Link></section>
      :learner.status==='awaiting_coach'?<section className={styles.card}><h2>코치가 확인 중입니다</h2><p>진단 결과와 학습 경로를 확인한 뒤 안내해 드릴게요.</p></section>
      :learner.status==='paused'?<p>학습이 일시 중지되어 있습니다. 코치에게 문의해 주세요.</p>
      :<section className={styles.card}><h2>오늘의 학습</h2><p>코치 확인이 완료되었습니다. 학습 세션 기능을 준비 중입니다.</p></section>;
  }catch(error){content=<p role="alert">{runtimeError(error)}</p>;}
  return <>
    <Header isLoggedIn userName={profile?.name || user.email} userRole={profile?.role} />
    <main className={styles.page}><h1>뿌리 깊은 수학 코칭</h1>
      {content}
    </main>
  </>;
}
