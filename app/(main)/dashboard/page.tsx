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

  const profile = await getProfile() as Profile | null;
  const supabase = await createServerSupabaseClient();

  // 내 수강 목록 조회
  const { data: enrollmentsData } = await supabase
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
    .order('created_at', { ascending: false });

  const enrollments = (enrollmentsData || []) as any[];

  // 각 enrollment별 레슨 정보 및 진도 조회
  const enrollmentsWithProgress = await Promise.all(
    enrollments.map(async (enrollment) => {
      const cohort = enrollment.cohorts;
      const course = cohort?.courses;

      // 해당 course의 전체 레슨들 (is_published 여부 관계없이)
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, sort_order, is_published')
        .eq('course_id', course.id)
        .order('sort_order', { ascending: true });

      const lessons = (lessonsData || []) as any[];
      const publishedLessonIds = lessons.filter(l => l.is_published).map(l => l.id);

      // 완료한 레슨 (공개된 레슨 기준)
      const { data: progressData } = publishedLessonIds.length > 0
        ? await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .eq('completed', true)
            .in('lesson_id', publishedLessonIds)
        : { data: [] };

      const progress = (progressData || []) as any[];

      return {
        ...enrollment,
        course,
        cohort,
        totalLessons: lessons.length,
        completedLessons: progress.length,
      };
    })
  );

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
