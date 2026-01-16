'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import styles from './Header.module.css';

interface HeaderProps {
  userName?: string | null;
  isLoggedIn?: boolean;
  userRole?: 'student' | 'admin';
}

export default function Header({ userName, isLoggedIn, userRole }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <header className={styles.header}>
      <Link href={isLoggedIn ? '/dashboard' : '/'} className={styles.logo}>
        <Image
          src="/logo_kr_b.png"
          alt="노베이스구조대"
          width={160}
          height={32}
          className={styles.logoImage}
          priority
        />
        <Image
          src="/logo_kr_w.png"
          alt="노베이스구조대"
          width={160}
          height={32}
          className={styles.logoImageDark}
          priority
        />
      </Link>

      {isLoggedIn && (
        <nav className={styles.nav}>
          <Link 
            href="/dashboard" 
            className={`${styles.navLink} ${isActive('/dashboard') ? styles.navLinkActive : ''}`}
          >
            대시보드
          </Link>
          <Link 
            href="/courses" 
            className={`${styles.navLink} ${isActive('/courses') ? styles.navLinkActive : ''}`}
          >
            수강신청
          </Link>
          <Link 
            href="/announcements" 
            className={`${styles.navLink} ${isActive('/announcements') ? styles.navLinkActive : ''}`}
          >
            공지사항
          </Link>
          {userRole === 'admin' && (
            <Link 
              href="/admin" 
              className={`${styles.navLink} ${isActive('/admin') ? styles.navLinkActive : ''}`}
            >
              관리자
            </Link>
          )}
        </nav>
      )}

      <div className={styles.userSection}>
        <ThemeToggle />
        {isLoggedIn ? (
          <>
            <span className={styles.userName}>{userName}</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              로그아웃
            </button>
          </>
        ) : (
          <Link href="/login" className={styles.navLink}>
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
