import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, CourseCard } from '@/components';
import { Profile } from '@/lib/database.types';
import { FaBook, FaInbox } from 'react-icons/fa';
import { HiHand } from 'react-icons/hi';
import styles from './dashboard.module.css';

export default async function DashboardPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  const supabase = await createServerSupabaseClient();

  // 내 수강 목록 조회
  const [{ data: enrollmentsData }, profileData] = await Promise.all([
    supabase
      .from('enrollments')
      .select(`
        *,
        cohorts (
          *,
          courses (*)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    getProfile(),
  ]);

  const profile = profileData as Profile | null;
  const enrollments = (enrollmentsData || []) as any[];

  // 수강 강좌들을 묶어서 조회하되, 응답 행 수 제한으로 레슨이 누락되지 않게 페이지 처리.
  const courseIds = [...new Set<string>(enrollments.map(e => e.cohorts?.courses?.id).filter(Boolean))];
  const lessons: { id: string; course_id: string; is_published: boolean }[] = [];
  const pageSize = 500;
  if (courseIds.length > 0) {
    for (let offset = 0; ; offset += pageSize) {
      const { data } = await supabase.from('lessons')
        .select('id, course_id, is_published').in('course_id', courseIds)
        .order('id').range(offset, offset + pageSize - 1);
      const page = data || [];
      lessons.push(...page);
      if (page.length < pageSize) break;
    }
  }
  const publishedLessonIds = lessons.filter(l => l.is_published).map(l => l.id);
  // 긴 URL과 응답 제한을 피하도록 진도 조회의 ID 목록도 나눔.
  const progressQueries: PromiseLike<{ data: { lesson_id: string }[] | null }>[] = [];
  for (let offset = 0; offset < publishedLessonIds.length; offset += 200) {
    progressQueries.push(supabase.from('lesson_progress').select('lesson_id')
      .eq('user_id', user.id).eq('completed', true)
      .in('lesson_id', publishedLessonIds.slice(offset, offset + 200)));
  }
  const progressResults = await Promise.all(progressQueries);
  const completedIds = new Set(progressResults.flatMap(({ data }) =>
    ((data || []) as { lesson_id: string }[]).map(p => p.lesson_id)
  ));
  const enrollmentsWithProgress = enrollments.filter(e => e.cohorts?.courses).map(enrollment => {
    const cohort = enrollment.cohorts;
    const course = cohort.courses;
    const courseLessons = lessons.filter(l => l.course_id === course.id);
    return {
      ...enrollment,
      course,
      cohort,
      totalLessons: courseLessons.length,
      completedLessons: courseLessons.filter(l => l.is_published && completedIds.has(l.id)).length,
    };
  });

  return (
    <div className={styles.page}>
      <Header 
        userName={profile?.name || user.email} 
        isLoggedIn={true}
        userRole={profile?.role}
      />
      
      <main className={styles.main}>
        <div className={styles.welcomeSection}>
          <h1 className={styles.welcomeTitle}>
            안녕하세요, {profile?.name || '학습자'}님! <HiHand className={styles.waveIcon} />
          </h1>
          <p className={styles.welcomeSubtitle}>
            오늘도 함께 성장해볼까요?
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.mainContent}>
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}><FaBook /></span>
                  내 강좌
                </h2>
              </div>

              {enrollmentsWithProgress.length > 0 ? (
                <div className={styles.coursesGrid}>
                  {enrollmentsWithProgress.map((item) => (
                    <CourseCard
                      key={item.id}
                      courseId={item.course.id}
                      cohortId={item.cohort.id}
                      courseTitle={item.course.title}
                      cohortTitle={item.cohort.title}
                      description={item.course.description}
                      thumbnailUrl={item.course.thumbnail_url}
                      totalLessons={item.totalLessons}
                      completedLessons={item.completedLessons}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}><FaInbox /></div>
                  <h3 className={styles.emptyTitle}>수강 중인 강좌가 없습니다</h3>
                  <p className={styles.emptyDescription}>
                    새로운 강좌를 찾아보세요!
                  </p>
                  <Link href="/courses" className={styles.browseCoursesLink}>
                    강좌 둘러보기
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
