import { redirect } from 'next/navigation';
import { getUser, getProfile } from '@/lib/supabase-server';
import { Header } from '@/components';
import { Profile } from '@/lib/database.types';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const profile = user ? await getProfile() as Profile | null : null;

  // 로그인 확인
  if (!user) {
    redirect('/login');
  }

  // 관리자 권한 확인
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header 
        userName={profile?.name || user?.email} 
        isLoggedIn={true}
        userRole={profile?.role}
      />
      {children}
    </div>
  );
}
