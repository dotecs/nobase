import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, ErrorPage } from '@/components';
import { Profile, Course, Cohort, Lesson, LessonProgress, Announcement } from '@/lib/database.types';
import { FaBook, FaCalendarAlt, FaList, FaBullhorn, FaThumbtack, FaCheck } from 'react-icons/fa';
import styles from './course.module.css';

interface CoursePageProps {
  params: Promise<{
    courseId: string;
    cohortId: string;
  }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId, cohortId } = await params;
  
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile() as Profile | null;
  const supabase = await createServerSupabaseClient();

  // 등록 확인
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .eq('status', 'active')
    .single();

  if (!enrollment) {
    return (
      <div className={styles.page}>
        <Header userName={profile?.name || user.email} isLoggedIn={true} userRole={profile?.role} />
        <ErrorPage
          icon="lock"
          title="접근 권한이 없습니다"
          description="이 강좌에 대한 수강 등록이 필요합니다. 강좌를 구매하셨다면 이메일로 받은 수강 시작 링크를 확인해 주세요."
          primaryAction={{
            label: '대시보드로 이동',
            href: '/dashboard',
          }}
        />
      </div>
    );
  }

  // 강좌 정보
  const { data: courseData } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  const { data: cohortData } = await supabase
    .from('cohorts')
    .select('*')
    .eq('id', cohortId)
    .single();

  const course = courseData as Course | null;
  const cohort = cohortData as Cohort | null;

  if (!course || !cohort) {
    notFound();
  }

  // 레슨 목록
  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('*')
    .eq('cohort_id', cohortId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  const lessons = (lessonsData || []) as Lesson[];

  // 진도 조회
  const lessonIds = lessons.map(l => l.id);
  const { data: progressData } = lessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('lesson_id', lessonIds)
    : { data: [] };

  const progress = (progressData || []) as any[];
  const completedLessonIds = new Set(progress.map(p => p.lesson_id));
  const totalLessons = lessons.length;
  const completedLessons = progress.length;
  const progressPercent = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  // 공지사항
  const { data: announcementsData } = await supabase
    .from('announcements')
    .select('*')
    .eq('cohort_id', cohortId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  const announcements = (announcementsData || []) as Announcement[];

  return (
    <div className={styles.page}>
      <Header userName={profile?.name || user.email} isLoggedIn={true} userRole={profile?.role} />

      <main className={styles.main}>
        <nav className={styles.breadcrumb}>
          <Link href="/dashboard" className={styles.breadcrumbLink}>
            대시보드
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span>{course.title}</span>
        </nav>

        <div className={styles.header}>
          <div className={styles.thumbnail}>
            {course.thumbnail_url ? (
              <img 
                src={course.thumbnail_url} 
                alt={course.title}
                className={styles.thumbnailImage}
              />
            ) : (
              <FaBook className={styles.thumbnailIcon} />
            )}
          </div>

          <div className={styles.headerContent}>
            <span className={styles.cohortBadge}><FaCalendarAlt /> {cohort.title}</span>
            <h1 className={styles.title}>{course.title}</h1>
            {course.description && (
              <p className={styles.description}>{course.description}</p>
            )}

            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>전체 레슨</span>
                <span className={styles.statValue}>{totalLessons}개</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>완료</span>
                <span className={styles.statValue}>{completedLessons}개</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>진도율</span>
                <span className={styles.statValue}>{progressPercent}%</span>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.mainContent}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}><FaList /></span>
                커리큘럼
              </h2>

              <div className={styles.lessonList}>
                {lessons.slice(0, 5).map((lesson, index) => {
                  const isCompleted = completedLessonIds.has(lesson.id);
                  return (
                    <Link 
                      key={lesson.id}
                      href={`/lessons/${lesson.id}`}
                      className={styles.lessonItem}
                    >
                      <span className={`${styles.lessonNumber} ${isCompleted ? styles.lessonComplete : styles.lessonIncomplete}`}>
                        {isCompleted ? <FaCheck /> : index + 1}
                      </span>
                      <span className={styles.lessonTitle}>{lesson.title}</span>
                    </Link>
                  );
                })}
              </div>

              {totalLessons > 5 && (
                <Link 
                  href={`/courses/${courseId}/cohorts/${cohortId}/curriculum`}
                  className={styles.viewAllLink}
                >
                  전체 커리큘럼 보기 ({totalLessons}개)
                </Link>
              )}
            </section>
          </div>

          <aside className={styles.sidebar}>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}><FaBullhorn /></span>
                공지사항
              </h2>

              {announcements.length > 0 ? (
                <div>
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className={styles.announcementItem}>
                      <Link 
                        href={`/announcements/${announcement.id}`}
                        className={styles.announcementTitle}
                      >
                        {announcement.is_pinned && (
                          <span className={styles.announcementPinned}><FaThumbtack /></span>
                        )}
                        {announcement.title}
                      </Link>
                      <div className={styles.announcementDate}>
                        {new Date(announcement.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>공지사항이 없습니다</p>
              )}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
