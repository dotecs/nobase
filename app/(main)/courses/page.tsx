import Link from 'next/link';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header } from '@/components';
import { Profile, Course, Cohort } from '@/lib/database.types';
import { FaBook, FaCalendarAlt, FaClock } from 'react-icons/fa';
import styles from './courses.module.css';

interface CourseWithCohorts extends Course {
  cohorts: Cohort[];
}

export default async function CoursesPage() {
  const user = await getUser();
  const profile = user ? await getProfile() as Profile | null : null;
  const supabase = await createServerSupabaseClient();

  // 공개된 강좌와 활성 기수 조회
  const { data: coursesData } = await supabase
    .from('courses')
    .select(`
      *,
      cohorts (*)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  // 사용자가 이미 등록한 기수 ID 조회
  let enrolledCohortIds: string[] = [];
  if (user) {
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('cohort_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'paused', 'pending']);
    
    enrolledCohortIds = ((enrollmentsData || []) as { cohort_id: string }[]).map(e => e.cohort_id);
  }

  // 활성 기수만 필터링 + 이미 등록한 기수 제외
  const courses = (coursesData || []).map((course: any) => ({
    ...course,
    cohorts: (course.cohorts || []).filter((cohort: Cohort) => 
      cohort.is_active && !enrolledCohortIds.includes(cohort.id)
    )
  })).filter((course: CourseWithCohorts) => course.cohorts.length > 0) as CourseWithCohorts[];

  return (
    <div className={styles.page}>
      <Header 
        userName={profile?.name || user?.email} 
        isLoggedIn={!!user}
        userRole={profile?.role}
      />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>수강 신청</h1>
          <p className={styles.subtitle}>
            노베이스 구조대와 함께 성장할 수 있는 강좌를 만나보세요
          </p>
        </div>

        {courses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><FaBook /></div>
            <h2 className={styles.emptyTitle}>현재 모집 중인 강좌가 없습니다</h2>
            <p className={styles.emptyDescription}>
              새로운 강좌가 열리면 안내해 드릴게요!
            </p>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map((course) => (
              <article key={course.id} className={styles.courseCard}>
                <div className={styles.courseThumbnail}>
                  {course.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className={styles.thumbnailImage}
                    />
                  ) : (
                    <div className={styles.thumbnailPlaceholder}>
                      <FaBook />
                    </div>
                  )}
                </div>
                
                <div className={styles.courseContent}>
                  <h2 className={styles.courseTitle}>{course.title}</h2>
                  {course.description && (
                    <p className={styles.courseDescription}>{course.description}</p>
                  )}
                  
                  <div className={styles.cohortList}>
                    <h3 className={styles.cohortListTitle}>
                      <FaCalendarAlt /> 모집 중인 기수
                    </h3>
                    {course.cohorts.map((cohort) => (
                      <Link 
                        key={cohort.id}
                        href={`/courses/${course.id}/enroll/${cohort.id}`}
                        className={styles.cohortItem}
                      >
                        <div className={styles.cohortInfo}>
                          <span className={styles.cohortTitle}>{cohort.title}</span>
                          {cohort.starts_at && (
                            <span className={styles.cohortDate}>
                              <FaClock /> 시작: {new Date(cohort.starts_at).toLocaleDateString('ko-KR')}
                            </span>
                          )}
                        </div>
                        <span className={styles.enrollButton}>신청하기</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
