import Link from 'next/link';
import { courseHref } from '@/lib/courses';
import { getCohortCheckoutUrl } from '@/lib/pricing';
import { getPricingContent } from '@/content/pricing';
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
  const supabase = await createServerSupabaseClient();

  // 공개된 강좌와 활성 기수 조회
  const [{ data: coursesData, error: coursesError }, profileData, { data: enrollmentsData }] = await Promise.all([
    supabase
      .from('courses')
      .select(`
        *,
        cohorts (*)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    getProfile(),
    user ? supabase.from('enrollments').select('cohort_id').eq('user_id', user.id).eq('status', 'active') : Promise.resolve({ data: [] }),
  ]);
  if (coursesError) throw coursesError;

  // 사용자가 이미 등록한 기수 ID 조회
  const profile = profileData as Profile | null;
  const enrolledCohortIds = ((enrollmentsData || []) as { cohort_id: string }[]).map(e => e.cohort_id);

  const courses = (coursesData || []) as CourseWithCohorts[];
  const { data: freeLessonRows, error: freeLessonError } = courses.length
    ? await supabase.from('lessons_public').select('course_id').eq('is_free', true)
        .in('course_id', courses.map(course => course.id))
    : { data: [], error: null };
  if (freeLessonError) throw freeLessonError;
  const freeCounts = new Map<string, number>();
  for (const lesson of (freeLessonRows || []) as { course_id: string }[]) {
    freeCounts.set(lesson.course_id, (freeCounts.get(lesson.course_id) || 0) + 1);
  }

  return (
    <div className={styles.page}>
      <Header 
        userName={profile?.name || user?.email} 
        isLoggedIn={!!user}
        userRole={profile?.role}
      />
      
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>커리큘럼</h1>
          <p className={styles.subtitle}>
            노베이스 구조대와 함께 성장할 수 있는 강좌를 만나보세요
          </p>
        </div>

        {courses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><FaBook /></div>
            <h2 className={styles.emptyTitle}>공개된 강좌가 없습니다</h2>
            <p className={styles.emptyDescription}>
              새로운 강좌가 열리면 안내해 드릴게요!
            </p>
          </div>
        ) : (
          <div className={styles.courseGrid}>
            {courses.map((course) => {
              const enrolledCohort = (course.cohorts || []).find(cohort => enrolledCohortIds.includes(cohort.id));
              const cohorts = (course.cohorts || []).filter(cohort => cohort.is_active && !enrolledCohortIds.includes(cohort.id));
              const freeCount = freeCounts.get(course.id) || 0;
              const badge = enrolledCohort ? '수강중' : cohorts.length ? '모집중' : freeCount ? `무료 레슨 ${freeCount}개` : null;
              const href = enrolledCohort
                ? `/courses/${course.id}/cohorts/${enrolledCohort.id}/curriculum`
                : courseHref(course);
              return (
              <article key={course.id} className={styles.courseCard}>
                <Link href={href}>
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
                  {badge && <span className={styles.enrollButton}>{badge}</span>}
                  {course.description && (
                    <p className={styles.courseDescription}>{course.description}</p>
                  )}
                  
                </div>
                </Link>
                {cohorts.length > 0 && <div className={styles.courseContent}>
                  <div className={styles.cohortList}>
                    <h3 className={styles.cohortListTitle}>
                      <FaCalendarAlt /> 모집 중인 기수
                    </h3>
                    {cohorts.map((cohort) => (
                      <a
                        key={cohort.id}
                        href={getCohortCheckoutUrl(cohort, getPricingContent(course.slug)?.plans) ?? `${courseHref(course)}/pricing`}
                        target="_blank"
                        rel="noopener noreferrer"
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
                      </a>
                    ))}
                  </div>
                </div>}
              </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
