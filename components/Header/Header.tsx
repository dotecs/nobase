'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import BrandLogo from '@/components/BrandLogo/BrandLogo';
import AccountDropdown from './AccountDropdown';
import { FiMenu, FiX } from 'react-icons/fi';
import styles from './Header.module.css';
import glass from '@/styles/glass.module.css';

interface HeaderProps {
  glassHeader?: boolean;
  userName?: string | null;
  isLoggedIn?: boolean;
  userRole?: 'student' | 'admin';
  landingNavigation?: { label: string; href: string }[];
  landingCta?: { label: string; href: string };
}
const defaultNavigation = [
  { label: '학습 프로그램', href: '/courses' },
  { label: '학습 방식', href: '/#how' },
  { label: '브랜드 소개', href: '/#about' },
];

export default function Header({ userName, isLoggedIn, userRole, landingNavigation, landingCta, glassHeader = false }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const useGlassHeader = glassHeader || pathname === '/' || pathname === '/courses' || pathname === '/booking' || /^\/courses\/[^/]+(?:\/pricing)?$/.test(pathname);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [compactLogo, setCompactLogo] = useState(false);
  const [hash, setHash] = useState('');
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const navigation = landingNavigation && !isLoggedIn ? landingNavigation : defaultNavigation;
  useEffect(() => { setIsMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const updateLogo = () => setCompactLogo(window.scrollY > 48);
    updateLogo();
    window.addEventListener('scroll', updateLogo, { passive: true });
    return () => window.removeEventListener('scroll', updateLogo);
  }, [pathname]);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update(); window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, [pathname]);
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previous = document.body.style.overflow;
    const trigger = menuButton.current;
    document.body.style.overflow = 'hidden';
    const items = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
    items()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
      if (event.key === 'Tab') {
        const links = items(), first = links[0], last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); trigger?.focus(); };
  }, [isMobileMenuOpen]);
  const handleLogout = async () => {
    const { error } = await createClientSupabaseClient().auth.signOut();
    if (error) throw error;
    setIsMobileMenuOpen(false); router.push('/login'); router.refresh();
  };
  const isActive = (href: string) => href.includes('#')
    ? pathname === (href.split('#')[0] || pathname) && hash === `#${href.split('#')[1]}`
    : pathname === href || pathname.startsWith(`${href}/`);
  const links = (mobile = false) => <>
    {navigation.map(item => <a key={item.href} href={item.href} aria-current={isActive(item.href) ? 'location' : undefined}
      className={`${mobile ? styles.sidebarLink : styles.navLink} ${isActive(item.href) ? mobile ? styles.sidebarLinkActive : styles.navLinkActive : ''}`}
      onClick={() => { setHash(item.href.includes('#') ? `#${item.href.split('#')[1]}` : ''); setIsMobileMenuOpen(false); }}>{item.label}</a>)}
    {landingNavigation && !isLoggedIn && landingCta && <Link href={landingCta.href} className={mobile ? styles.sidebarLink : styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>{landingCta.label}</Link>}
  </>;
  return <>
    <header data-scrolled={compactLogo} className={`${styles.header} ${useGlassHeader ? glass.glassBar : styles.solid}`}>
      <Link href="/" className={styles.logo} data-compact={compactLogo}><BrandLogo compact={compactLogo} /></Link>
      <nav className={styles.nav} aria-label="주 메뉴">{links()}</nav>
      <div className={styles.userSection}>
        {isLoggedIn ? <AccountDropdown userName={userName} userRole={userRole} onLogout={handleLogout} />
          : <><ThemeToggle /><Link href="/login" className={styles.navLink}>로그인</Link></>}
        <button ref={menuButton} className={styles.hamburgerButton} onClick={() => setIsMobileMenuOpen(value => !value)} aria-label="메뉴 열기" aria-expanded={isMobileMenuOpen} aria-controls="mobile-navigation"><FiMenu size={24} /></button>
      </div>
    </header>
    {isMobileMenuOpen && <><div className={styles.overlay} onClick={() => setIsMobileMenuOpen(false)} />
      <aside ref={sidebar} id="mobile-navigation" className={`${styles.sidebar} ${styles.sidebarOpen}`} role="dialog" aria-modal="true" aria-label="전체 메뉴">
        <div className={styles.sidebarHeader}><span className={styles.sidebarUserName}>{userName}</span><button className={styles.closeButton} onClick={() => setIsMobileMenuOpen(false)} aria-label="메뉴 닫기"><FiX size={24} /></button></div>
        <nav className={styles.sidebarNav} aria-label="모바일 메뉴">{links(true)}</nav>
        {!isLoggedIn && <div className={styles.sidebarFooter}><Link href="/login" className={styles.sidebarLink}>로그인</Link></div>}
      </aside></>}
  </>;
}
