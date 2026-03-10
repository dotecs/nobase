import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { FaBook, FaUsers, FaGraduationCap, FaBullhorn, FaPlus, FaEdit } from 'react-icons/fa';
import { Button } from '@/components';
import { Course } from '@/lib/database.types';
import styles from './admin.module.css';

interface CourseWithCohorts extends Course {
  cohorts: { id: string }[];
}

export default async function AdminPage() {
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

  // 강좌 목록 조회
  const { data: coursesData } = await supabase
    .from('courses')
    .select(`
      *,
      cohorts (id)
    `)
    .order('created_at', { ascending: false });

  const courses = (coursesData || []) as CourseWithCohorts[];

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
        <Link href="/admin" className={`${styles.tab} ${styles.active}`}>
          강좌 관리
        </Link>
        <Link href="/admin/cohorts" className={styles.tab}>
          기수 관리
        </Link>
        <Link href="/admin/enrollments" className={styles.tab}>
          수강신청 관리
        </Link>
        <Link href="/admin/users" className={styles.tab}>
          사용자 관리
        </Link>
        <Link href="/admin/questions" className={styles.tab}>
          질문 관리
        </Link>
      </div>

      {/* Course List */}
      <div className={styles.courseSection}>
        <div className={styles.sectionHeader}>
          <h2>강좌 목록</h2>
          <Button href="/admin/courses/new" size="sm">
            <FaPlus /> 새 강좌
          </Button>
        </div>

        {courses && courses.length > 0 ? (
          <table className={styles.courseTable}>
            <thead>
              <tr>
                <th>강좌</th>
                <th>슬러그</th>
                <th>기수</th>
                <th>상태</th>
                <th>생성일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <div className={styles.courseInfo}>
                      <div className={styles.courseThumbnail}>
                        {course.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.thumbnail_url} alt={course.title} />
                        ) : (
                          <div className={styles.thumbnailPlaceholder}>
                            <FaBook />
                          </div>
                        )}
                      </div>
                      <span className={styles.courseTitle}>{course.title}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.courseSlug}>{course.slug}</span>
                  </td>
                  <td>{(course.cohorts as any[])?.length || 0}개</td>
                  <td>
                    <span className={`${styles.badge} ${course.is_published ? styles.published : styles.draft}`}>
                      {course.is_published ? '공개' : '비공개'}
                    </span>
                  </td>
                  <td>{new Date(course.created_at).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link 
                        href={`/admin/courses/${course.id}`} 
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
              <FaBook />
            </div>
            <p>등록된 강좌가 없습니다</p>
          </div>
        )}
      </div>
    </main>
  );
}
