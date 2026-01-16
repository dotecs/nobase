import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { FaBook, FaUsers, FaGraduationCap, FaBullhorn, FaPlus, FaEdit, FaCalendarAlt } from 'react-icons/fa';
import { Button } from '@/components';
import { Cohort } from '@/lib/database.types';
import styles from '../admin.module.css';

interface CohortWithRelations extends Cohort {
  courses: { id: string; title: string };
  enrollments: { id: string }[];
}

export default async function CohortsPage() {
  const supabase = await createServerSupabaseClient();

  // 통계 데이터 조회
  const [
    { count: courseCount },
    { count: cohortCount },
    { count: enrollmentCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('cohorts').select('*', { count: 'exact', head: true }),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  // 기수 목록 조회
  const { data: cohortsData } = await supabase
    .from('cohorts')
    .select(`
      *,
      courses (id, title),
      enrollments (id)
    `)
    .order('created_at', { ascending: false });

  const cohorts = (cohortsData || []) as CohortWithRelations[];

  return (
    <main className={styles.main}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>관리자 대시보드</h1>
          <p>강좌, 기수, 사용자를 관리합니다</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaBook />
          </div>
          <div className={styles.statInfo}>
            <h3>{courseCount || 0}</h3>
            <p>전체 강좌</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaGraduationCap />
          </div>
          <div className={styles.statInfo}>
            <h3>{cohortCount || 0}</h3>
            <p>전체 기수</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUsers />
          </div>
          <div className={styles.statInfo}>
            <h3>{enrollmentCount || 0}</h3>
            <p>수강 등록</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaBullhorn />
          </div>
          <div className={styles.statInfo}>
            <h3>{userCount || 0}</h3>
            <p>전체 사용자</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <Link href="/admin" className={styles.tab}>
          강좌 관리
        </Link>
        <Link href="/admin/cohorts" className={`${styles.tab} ${styles.active}`}>
          기수 관리
        </Link>
        <Link href="/admin/users" className={styles.tab}>
          사용자 관리
        </Link>
      </div>

      {/* Cohort List */}
      <div className={styles.courseSection}>
        <div className={styles.sectionHeader}>
          <h2>기수 목록</h2>
          <Button href="/admin/cohorts/new" size="sm">
            <FaPlus /> 새 기수
          </Button>
        </div>

        {cohorts && cohorts.length > 0 ? (
          <table className={styles.courseTable}>
            <thead>
              <tr>
                <th>기수</th>
                <th>강좌</th>
                <th>수강생</th>
                <th>기간</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((cohort) => (
                <tr key={cohort.id}>
                  <td>
                    <span className={styles.courseTitle}>{cohort.title}</span>
                    {cohort.slug && (
                      <div className={styles.courseSlug}>{cohort.slug}</div>
                    )}
                  </td>
                  <td>{(cohort.courses as any)?.title || '-'}</td>
                  <td>{(cohort.enrollments as any[])?.length || 0}명</td>
                  <td>
                    {cohort.starts_at ? (
                      <span className={styles.courseSlug}>
                        {new Date(cohort.starts_at).toLocaleDateString('ko-KR')}
                        {cohort.ends_at && ` ~ ${new Date(cohort.ends_at).toLocaleDateString('ko-KR')}`}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${cohort.is_active ? styles.published : styles.draft}`}>
                      {cohort.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link 
                        href={`/admin/cohorts/${cohort.id}`} 
                        className={`${styles.actionBtn} ${styles.edit}`}
                        title="수정"
                      >
                        <FaEdit />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FaCalendarAlt />
            </div>
            <p>등록된 기수가 없습니다</p>
          </div>
        )}
      </div>
    </main>
  );
}
