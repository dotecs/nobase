import { redirect } from 'next/navigation';
import { getUser, getProfile } from '@/lib/supabase-server';
import { Header } from '@/components';
import { Profile } from '@/lib/database.types';
import AdminSidebar from './AdminSidebar';
import { getAdminBadgeCounts } from './admin-counts';
import styles from './admin-shell.module.css';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const profile = user ? ((await getProfile()) as Profile | null) : null;

  // 로그인 확인
  if (!user) {
    redirect('/login');
  }

  // 관리자 권한 확인
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const counts = await getAdminBadgeCounts();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header userName={profile?.name || user?.email} isLoggedIn={true} userRole={profile?.role} />
      <div className={styles.shell}>
        <AdminSidebar counts={counts} />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
