'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaThLarge,
  FaBook,
  FaCalendarAlt,
  FaClipboardCheck,
  FaUsers,
  FaQuestionCircle,
  FaArrowLeft,
  FaUserShield,
} from 'react-icons/fa';
import styles from './admin-shell.module.css';

export interface AdminBadgeCounts {
  pendingEnrollments: number;
  unregisteredUsers: number;
  pendingQuestions: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  badge?: number;
  badgeTone?: 'warn' | 'info';
}

export default function AdminSidebar({ counts }: { counts: AdminBadgeCounts }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: '/admin', label: '대시보드', icon: <FaThLarge />, exact: true },
    { href: '/admin/courses', label: '강좌 관리', icon: <FaBook /> },
    { href: '/admin/cohorts', label: '기수 관리', icon: <FaCalendarAlt /> },
    {
      href: '/admin/enrollments',
      label: '수강신청 관리',
      icon: <FaClipboardCheck />,
      badge: counts.pendingEnrollments,
      badgeTone: 'warn',
    },
    {
      href: '/admin/users',
      label: '사용자 관리',
      icon: <FaUsers />,
      badge: counts.unregisteredUsers,
      badgeTone: 'info',
    },
    {
      href: '/admin/questions',
      label: '질문 관리',
      icon: <FaQuestionCircle />,
      badge: counts.pendingQuestions,
      badgeTone: 'warn',
    },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <aside className={styles.sidebar} aria-label="관리자 메뉴">
      <div className={styles.sidebarTitle}>
        <FaUserShield /> 관리자
      </div>
      <nav className={styles.nav}>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${isActive(item) ? styles.navActive : ''}`}
            aria-current={isActive(item) ? 'page' : undefined}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
            {!!item.badge && item.badge > 0 && (
              <span className={`${styles.navBadge} ${item.badgeTone === 'info' ? styles.navBadgeInfo : ''}`}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <Link href="/dashboard" className={styles.navItem}>
          <span className={styles.navIcon}>
            <FaArrowLeft />
          </span>
          <span className={styles.navLabel}>학생 화면으로</span>
        </Link>
      </div>
    </aside>
  );
}
