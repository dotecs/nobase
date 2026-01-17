'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import { FaBars, FaTimes } from 'react-icons/fa';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 경로 변경 시 메뉴 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // 메뉴 열렸을 때 body 스크롤 방지
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    router.push('/login');
    router.refresh();
  };

  const isActive = (path: string) => pathname.startsWith(path);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
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
          
          {/* 모바일 햄버거 버튼 */}
          {isLoggedIn && (
            <button 
              className={styles.hamburgerButton}
              onClick={toggleMobileMenu}
              aria-label="메뉴 열기"
            >
              <FaBars />
            </button>
          )}
        </div>
      </header>

      {/* 모바일 사이드바 오버레이 */}
      {isMobileMenuOpen && (
        <div 
          className={styles.overlay}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 모바일 사이드바 */}
      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarUserName}>{userName}</span>
          <button 
            className={styles.closeButton}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="메뉴 닫기"
          >
            <FaTimes />
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <Link 
            href="/dashboard" 
            className={`${styles.sidebarLink} ${isActive('/dashboard') ? styles.sidebarLinkActive : ''}`}
          >
            대시보드
          </Link>
          <Link 
            href="/courses" 
            className={`${styles.sidebarLink} ${isActive('/courses') ? styles.sidebarLinkActive : ''}`}
          >
            수강신청
          </Link>
          <Link 
            href="/announcements" 
            className={`${styles.sidebarLink} ${isActive('/announcements') ? styles.sidebarLinkActive : ''}`}
          >
            공지사항
          </Link>
          {userRole === 'admin' && (
            <Link 
              href="/admin" 
              className={`${styles.sidebarLink} ${isActive('/admin') ? styles.sidebarLinkActive : ''}`}
            >
              관리자
            </Link>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.sidebarLogout}>
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
