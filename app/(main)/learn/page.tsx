import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components';
import { getUser, getProfile } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import type { Profile } from '@/lib/database.types';
import styles from './learn.module.css';

export const metadata: Metadata = { title: '뿌리 깊은 수학 코칭', robots: { index: false, follow: false } };

export default async function LearnPage() {
  const user = await getUser();
  if (!user) redirect('/login?returnTo=/learn');
  const [access, profileData] = await Promise.all([hasLearnAccess(user.id), getProfile()]);
  const profile = profileData as Profile | null;
  return <>
    <Header isLoggedIn userName={profile?.name || user.email} userRole={profile?.role} />
    <main className={styles.page}><h1>뿌리 깊은 수학 코칭</h1>
      <p>{access.granted ? 'Phase 2에서 열립니다' : '코칭 과정 등록 후 이용할 수 있습니다'}</p>
    </main>
  </>;
}
