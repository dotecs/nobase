import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { FaPlus, FaEdit, FaCalendarAlt } from 'react-icons/fa';
import AdminPageHeader from '../AdminPageHeader';
import { Button } from '@/components';
import { Cohort } from '@/lib/database.types';
import styles from '../admin.module.css';

interface CohortWithRelations extends Cohort {
  courses: { id: string; title: string };
  enrollments: { id: string }[];
}

export const dynamic = 'force-dynamic';

export default async function CohortsPage() {
  const supabase = await createServerSupabaseClient();

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
      <AdminPageHeader
        title="기수 관리"
        description="강좌별 기수(개강 회차)와 수강 인원을 관리합니다"
        actions={
          <Button href="/admin/cohorts/new" size="sm">
            <FaPlus /> 새 기수
          </Button>
        }
      />

      <div className={styles.courseSection}>
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
