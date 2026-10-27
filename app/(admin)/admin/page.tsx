import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  FaBook,
  FaUsers,
  FaGraduationCap,
  FaClipboardCheck,
  FaUserPlus,
  FaQuestionCircle,
  FaChevronRight,
  FaCheckCircle,
} from 'react-icons/fa';
import AdminPageHeader from './AdminPageHeader';
import { getAdminBadgeCounts } from '../admin-counts';
import styles from './admin.module.css';
import { ENROLLMENT_STATUS_LABEL } from '@/lib/enrollment-status';

export const dynamic = 'force-dynamic';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

export default async function AdminOverviewPage() {
  const supabase = await createServerSupabaseClient();

  const [counts, courseRes, cohortRes, activeEnrollRes, userRes, recentUsersRes, recentEnrollRes] =
    await Promise.all([
      getAdminBadgeCounts(),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('cohorts').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('user_id, name, email, created_at')
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('enrollments')
        .select('id, user_id, status, created_at, cohort:cohorts ( title, course:courses ( title ) )')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

  // 최근 수강신청의 이름은 profiles에서 따로 매칭 (직접 FK 없음)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentEnrollments = (recentEnrollRes.data || []) as any[];
  const recentUserIds = recentEnrollments.map((e) => e.user_id);
  const { data: namesData } =
    recentUserIds.length > 0
      ? await supabase.from('profiles').select('user_id, name').in('user_id', recentUserIds)
      : { data: [] };
  const nameMap = new Map(((namesData || []) as { user_id: string; name: string | null }[]).map((p) => [p.user_id, p.name]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentUsers = (recentUsersRes.data || []) as any[];

  const todos = [
    {
      href: '/admin/enrollments',
      icon: <FaClipboardCheck />,
      count: counts.pendingEnrollments,
      label: '입금 대기 수강신청',
      hint: '입금 확인 후 승인하면 바로 학습이 열립니다',
      tone: 'warn' as const,
    },
    {
      href: '/admin/users',
      icon: <FaUserPlus />,
      count: counts.unregisteredUsers,
      label: '미등록 신규 회원',
      hint: '가입만 하고 기수에 등록되지 않은 학생',
      tone: 'info' as const,
    },
    {
      href: '/admin/questions?status=pending',
      icon: <FaQuestionCircle />,
      count: counts.pendingQuestions,
      label: '답변 대기 질문',
      hint: '강의 페이지에서 올라온 질문',
      tone: 'warn' as const,
    },
  ];
  const nothingToDo = todos.every((t) => t.count === 0);

  return (
    <main className={styles.main}>
      <AdminPageHeader title="대시보드" description="오늘 처리할 일과 운영 현황을 한눈에 봅니다" />

      {/* 할 일 */}
      <section className={styles.block}>
        <h2 className={styles.blockTitle}>처리 대기</h2>
        {nothingToDo ? (
          <div className={styles.allClear}>
            <FaCheckCircle /> 처리할 항목이 없습니다. 모두 정리됐어요.
          </div>
        ) : (
          <div className={styles.todoGrid}>
            {todos.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`${styles.todoCard} ${t.count > 0 ? styles[`todo_${t.tone}`] : styles.todoIdle}`}
              >
                <span className={styles.todoIcon}>{t.icon}</span>
                <span className={styles.todoBody}>
                  <span className={styles.todoCount}>{t.count}</span>
                  <span className={styles.todoLabel}>{t.label}</span>
                  <span className={styles.todoHint}>{t.hint}</span>
                </span>
                <FaChevronRight className={styles.todoArrow} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 현황 */}
      <section className={styles.block}>
        <h2 className={styles.blockTitle}>운영 현황</h2>
        <div className={styles.statsGrid}>
          <Link href="/admin/courses" className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaBook />
            </div>
            <div className={styles.statInfo}>
              <h3>{courseRes.count || 0}</h3>
              <p>강좌</p>
            </div>
          </Link>
          <Link href="/admin/cohorts" className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaGraduationCap />
            </div>
            <div className={styles.statInfo}>
              <h3>{cohortRes.count || 0}</h3>
              <p>활성 기수</p>
            </div>
          </Link>
          <Link href="/admin/enrollments" className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaClipboardCheck />
            </div>
            <div className={styles.statInfo}>
              <h3>{activeEnrollRes.count || 0}</h3>
              <p>수강 중</p>
            </div>
          </Link>
          <Link href="/admin/users" className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaUsers />
            </div>
            <div className={styles.statInfo}>
              <h3>{userRes.count || 0}</h3>
              <p>전체 회원</p>
            </div>
          </Link>
        </div>
      </section>

      {/* 최근 활동 */}
      <div className={styles.twoCol}>
        <section className={styles.courseSection}>
          <div className={styles.sectionHeader}>
            <h2>최근 가입</h2>
            <Link href="/admin/users" className={styles.sectionLink}>
              전체 보기 <FaChevronRight />
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <div className={styles.emptyState}>
              <p>아직 가입한 학생이 없습니다</p>
            </div>
          ) : (
            <ul className={styles.recentList}>
              {recentUsers.map((u) => (
                <li key={u.user_id} className={styles.recentItem}>
                  <Link href={`/admin/users/${u.user_id}`} className={styles.recentMain}>
                    <span className={styles.recentTitle}>{u.name || '이름 없음'}</span>
                    <span className={styles.recentSub}>{u.email || ''}</span>
                  </Link>
                  <span className={styles.recentMeta}>{fmtDateTime(u.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.courseSection}>
          <div className={styles.sectionHeader}>
            <h2>최근 수강신청</h2>
            <Link href="/admin/enrollments" className={styles.sectionLink}>
              전체 보기 <FaChevronRight />
            </Link>
          </div>
          {recentEnrollments.length === 0 ? (
            <div className={styles.emptyState}>
              <p>수강신청 내역이 없습니다</p>
            </div>
          ) : (
            <ul className={styles.recentList}>
              {recentEnrollments.map((e) => (
                <li key={e.id} className={styles.recentItem}>
                  <div className={styles.recentMain}>
                    <span className={styles.recentTitle}>
                      {nameMap.get(e.user_id) || '이름 없음'}
                      <span className={`${styles.badge} ${e.status === 'active' ? styles.published : styles.draft}`}>
                        {ENROLLMENT_STATUS_LABEL[e.status] ?? e.status}
                      </span>
                    </span>
                    <span className={styles.recentSub}>
                      {e.cohort?.course?.title} · {e.cohort?.title}
                    </span>
                  </div>
                  <span className={styles.recentMeta}>{fmtDateTime(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
