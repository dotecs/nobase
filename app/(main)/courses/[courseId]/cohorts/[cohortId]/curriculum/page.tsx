import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, ErrorPage } from '@/components';
import { Profile, Course, Cohort, Lesson, Subject } from '@/lib/database.types';
import { FaCheck, FaClock, FaLock, FaArrowLeft } from 'react-icons/fa';
import styles from './curriculum.module.css';

interface CurriculumPageProps {
  params: Promise<{
    courseId: string;
    cohortId: string;
  }>;
  searchParams: Promise<{
    subject?: string;
  }>;
}

export default async function CurriculumPage({ params, searchParams }: CurriculumPageProps) {
  const { courseId, cohortId } = await params;
  const { subject: subjectId } = await searchParams;
  
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
          description="이 강좌에 대한 수강 등록이 필요합니다."
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

  // 과목 정보 조회 (subjectId가 있는 경우)
  let subject: Subject | null = null;
  if (subjectId) {
    const { data: subjectData } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .single();
    subject = subjectData as Subject | null;
  }

  // 레슨 목록 (subjectId가 있으면 해당 과목의 레슨만)
  let lessonsQuery = supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true });

  if (subjectId) {
    lessonsQuery = lessonsQuery.eq('subject_id', subjectId);
  }

  const { data: lessonsData } = await lessonsQuery;

  const lessons = (lessonsData || []) as Lesson[];
  
  // 공개된 레슨만 필터 (진도 계산용)
  const publishedLessons = lessons.filter(l => l.is_published);

  // 진도 조회 (공개된 레슨 기준)
  const publishedLessonIds = publishedLessons.map(l => l.id);
  const { data: progressData } = publishedLessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('lesson_id', publishedLessonIds)
    : { data: [] };

  const progress = (progressData || []) as any[];
  const completedLessonIds = new Set(progress.map(p => p.lesson_id));
  const totalLessons = publishedLessons.length;
  const completedLessons = progress.length;
  const progressPercent = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  return (
    <div className={styles.page}>
      <Header userName={profile?.name || user.email} isLoggedIn={true} userRole={profile?.role} />

      <main className={styles.main}>
        <nav className={styles.breadcrumb}>
          <Link href="/dashboard" className={styles.breadcrumbLink}>
            대시보드
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link 
            href={`/courses/${courseId}/cohorts/${cohortId}`}
            className={styles.breadcrumbLink}
          >
            {course.title}
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span>{subject ? subject.title : '커리큘럼'}</span>
        </nav>

        <div className={styles.header}>
          <Link 
            href={`/courses/${courseId}/cohorts/${cohortId}`}
            className={styles.backLink}
          >
            <FaArrowLeft /> 과목 목록으로
          </Link>
          <h1 className={styles.title}>{subject ? subject.title : '커리큘럼'}</h1>
          {subject?.description && (
            <p className={styles.subtitle}>{subject.description}</p>
          )}
          {!subject && (
            <p className={styles.subtitle}>
              {course.title} · {cohort.title}
            </p>
          )}
        </div>

        <div className={styles.progressSummary}>
          <div className={styles.progressInfo}>
            <span className={styles.progressLabel}>학습 진도</span>
            <span className={styles.progressValue}>
              {completedLessons} / {totalLessons} 완료 ({progressPercent}%)
            </span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className={styles.lessonList}>
          {lessons.map((lesson, index) => {
            const isCompleted = completedLessonIds.has(lesson.id);
            const now = new Date();
            const availableAt = lesson.available_at ? new Date(lesson.available_at) : null;
            const isScheduled = availableAt && availableAt > now; // 공개 예정 (시간 도래 안함)
            const isUnpublished = !lesson.is_published; // 아직 미공개
            const isLocked = isScheduled || isUnpublished; // 접근 불가 상태
            
            // 공개 예정일 포맷
            const formattedDate = availableAt 
              ? availableAt.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : null;

            // 상태 메시지 결정
            let statusMessage = '';
            if (isUnpublished && availableAt) {
              statusMessage = `${formattedDate} 공개 예정`;
            } else if (isUnpublished) {
              statusMessage = '준비 중';
            } else if (isScheduled && formattedDate) {
              statusMessage = `${formattedDate} 공개 예정`;
            }

            const content = (
              <>
                <span className={`${styles.lessonNumber} ${isCompleted ? styles.lessonComplete : isLocked ? styles.lessonUpcomingNum : styles.lessonIncomplete}`}>
                  {isCompleted ? <FaCheck /> : isUnpublished ? <FaLock /> : isScheduled ? <FaClock /> : index + 1}
                </span>
                <div className={styles.lessonContent}>
                  <div className={styles.lessonTitle}>{lesson.title}</div>
                  {isLocked && statusMessage && (
                    <div className={styles.lessonUpcomingDate}>{statusMessage}</div>
                  )}
                  {!isLocked && lesson.description && (
                    <div className={styles.lessonDescription}>{lesson.description}</div>
                  )}
                </div>
                <span className={`${styles.lessonStatus} ${isCompleted ? styles.statusComplete : isLocked ? styles.statusUpcoming : styles.statusIncomplete}`}>
                  {isCompleted ? '완료' : isLocked ? '예정' : '미완료'}
                </span>
              </>
            );

            if (isLocked) {
              return (
                <div 
                  key={lesson.id}
                  className={`${styles.lessonItem} ${styles.lessonUpcoming}`}
                >
                  {content}
                </div>
              );
            }

            return (
              <Link 
                key={lesson.id}
                href={`/lessons/${lesson.id}`}
                className={styles.lessonItem}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
