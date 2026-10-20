import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, ErrorPage } from '@/components';
import { Profile, Course, Cohort, Announcement, Subject, Enrollment } from '@/lib/database.types';
import { FaBook, FaCalendarAlt, FaBullhorn, FaThumbtack, FaChevronRight, FaGraduationCap, FaPlayCircle, FaUserTie, FaLock } from 'react-icons/fa';
import { INTERVIEW_WORKBOOK_PATH } from '@/lib/interview-workbook';
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

  const supabase = await createServerSupabaseClient();

  // 등록 확인
  const [{ data: enrollment }, profileData] = await Promise.all([
    supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', user.id)
      .eq('cohort_id', cohortId)
      .eq('status', 'active')
      .single(),
    getProfile(),
  ]);

  const profile = profileData as Profile | null;

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
  const [{ data: courseData }, { data: cohortData }] = await Promise.all([
    supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single(),
    supabase
      .from('cohorts')
      .select('*')
      .eq('id', cohortId)
      .single(),
  ]);

  const course = courseData as Course | null;
  const cohort = cohortData as Cohort | null;

  if (!course || !cohort) {
    notFound();
  }

  // 과목(Subject) 목록 조회 — RLS가 visibility에 따라 자동 필터
  const [{ data: subjectsData }, { data: lessonsData }, { data: announcementsData }] = await Promise.all([
    supabase
      .from('subjects')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, subject_id, is_published, sort_order')
      .eq('course_id', courseId)
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('announcements')
      .select('*')
      .eq('cohort_id', cohortId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const subjects = (subjectsData || []) as Subject[];
  const visibleSubjectIds = new Set(subjects.map((s) => s.id));

  // 각 과목별 레슨 수 조회 — subject 미배정(subject_id=null)이거나 접근 가능한 subject만 노출

  const lessons = ((lessonsData || []) as { id: string; subject_id: string | null; is_published: boolean; sort_order: number }[])
    .filter((l) => l.subject_id === null || visibleSubjectIds.has(l.subject_id));

  // 과목별 레슨 카운트
  const lessonCountBySubject = lessons.reduce((acc, lesson) => {
    if (lesson.subject_id) {
      acc[lesson.subject_id] = (acc[lesson.subject_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 과목별 첫 레슨 ID (sort_order 오름차순 기준 첫 항목)
  const firstLessonBySubject = lessons.reduce((acc, lesson) => {
    if (lesson.subject_id && !acc[lesson.subject_id]) {
      acc[lesson.subject_id] = lesson.id;
    }
    return acc;
  }, {} as Record<string, string>);

  // 총 레슨 수
  const totalLessons = lessons.length;

  // 진도 조회
  const publishedLessonIds = lessons.map(l => l.id);
  const { data: progressData } = publishedLessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('lesson_id', publishedLessonIds)
    : { data: [] };

  const progress = (progressData || []) as { lesson_id: string }[];
  const completedLessons = progress.length;
  const progressPercent = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  // 공지사항

  const announcements = (announcementsData || []) as Announcement[];

  // 면접 대비 워크북 — 코스에 연결된 경우에만 카드 표시, 필기 합격 처리된 수강생에게만 열림
  const showWorkbookCard = !!course.interview_workbook_enabled;
  const workbookGranted = !!(enrollment as Enrollment).written_passed_at;

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
              <Image 
                src={course.thumbnail_url} 
                alt={course.title}
                className={styles.thumbnailImage}
                width={200}
                height={120}
                unoptimized
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
                <span className={styles.sectionIcon}><FaGraduationCap /></span>
                과목 목록
              </h2>

              {subjects.length > 0 ? (
                <div className={styles.subjectList}>
                  {subjects.map((subject, index) => {
                    const lessonCount = lessonCountBySubject[subject.id] || 0;
                    const firstLessonId = firstLessonBySubject[subject.id];
                    const href = firstLessonId
                      ? `/lessons/${firstLessonId}`
                      : `/courses/${courseId}/cohorts/${cohortId}/curriculum?subject=${subject.id}`;

                    return (
                      <Link
                        key={subject.id}
                        href={href}
                        className={styles.subjectCard}
                      >
                        <div className={styles.subjectNumber}>{index + 1}</div>
                        <div className={styles.subjectInfo}>
                          <h3 className={styles.subjectTitle}>{subject.title}</h3>
                          {subject.description && (
                            <p className={styles.subjectDescription}>{subject.description}</p>
                          )}
                          <div className={styles.subjectMeta}>
                            <span className={styles.lessonCountBadge}>
                              <FaPlayCircle /> {lessonCount}개 강의
                            </span>
                          </div>
                        </div>
                        <span className={styles.subjectArrow}>
                          <FaChevronRight />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.emptyText}>등록된 과목이 없습니다</p>
              )}
            </section>
          </div>

          <aside className={styles.sidebar}>
            {showWorkbookCard && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <span className={styles.sectionIcon}><FaUserTie /></span>
                  면접 대비
                </h2>
                {workbookGranted ? (
                  <Link href={INTERVIEW_WORKBOOK_PATH} className={styles.workbookCard}>
                    <div className={styles.workbookInfo}>
                      <span className={styles.workbookTitle}>SSIT 면접 대비 워크북</span>
                      <span className={styles.workbookDesc}>
                        필기 합격을 축하합니다! 면접 개요 · PPT 발표 가이드 · 예상 질문 · 체크리스트
                      </span>
                    </div>
                    <span className={styles.subjectArrow}><FaChevronRight /></span>
                  </Link>
                ) : (
                  <div className={`${styles.workbookCard} ${styles.workbookLocked}`}>
                    <div className={styles.workbookInfo}>
                      <span className={styles.workbookTitle}><FaLock /> SSIT 면접 대비 워크북</span>
                      <span className={styles.workbookDesc}>
                        필기 합격 후 열리는 자료입니다. 합격 소식을 카카오톡 채널로 알려주시면 바로 열어드립니다.
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

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
