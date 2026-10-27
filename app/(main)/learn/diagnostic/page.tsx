import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import { diagnosticView } from '@/lib/learn/diagnostic-runtime';
import { runtimeError } from '@/lib/learn/runtime';
import { DiagnosticClient } from './DiagnosticClient';
import styles from '../learn.module.css';
export default async function DiagnosticPage() {
  const user=await getUser();if(!user)redirect('/login?returnTo=/learn/diagnostic');
  const access=await hasLearnAccess(user.id);if(!access.granted)return <main className={styles.page}><p>코칭 과정 등록 후 이용할 수 있습니다.</p></main>;
  try {const view=await diagnosticView();return <main className={styles.page}><Link href="/learn">학습 홈</Link><h1>출발점 진단</h1>{!view?<p>학습 홈에서 진단을 시작해 주세요.</p>:view.complete?<section className={styles.card}><h2>진단을 마쳤습니다</h2><p>코치 확인 후 결과를 알려드려요.</p><Link href="/learn">학습 홈으로</Link></section>:<DiagnosticClient key={`${view.sessionId}:${view.planIndex}`} {...view} />}</main>;}catch(error){return <main className={styles.page}><p role="alert">{runtimeError(error, 'app/(main)/learn/diagnostic/page.tsx')}</p><Link href="/learn">학습 홈</Link></main>;}
}
