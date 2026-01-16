import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, ErrorPage } from '@/components';
import { Profile, Course, Cohort, Lesson } from '@/lib/database.types';
import { FaCheck } from 'react-icons/fa';
import styles from './curriculum.module.css';

interface CurriculumPageProps {
  params: Promise<{
    courseId: string;
    cohortId: string;
  }>;
}

export default async function CurriculumPage({ params }: CurriculumPageProps) {
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
          <span>커리큘럼</span>
        </nav>

        <div className={styles.header}>
          <h1 className={styles.title}>커리큘럼</h1>
          <p className={styles.subtitle}>
            {course.title} · {cohort.title}
          </p>
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
            return (
              <Link 
                key={lesson.id}
                href={`/lessons/${lesson.id}`}
                className={styles.lessonItem}
              >
                <span className={`${styles.lessonNumber} ${isCompleted ? styles.lessonComplete : styles.lessonIncomplete}`}>
                  {isCompleted ? <FaCheck /> : index + 1}
                </span>
                <div className={styles.lessonContent}>
                  <div className={styles.lessonTitle}>{lesson.title}</div>
                  {lesson.description && (
                    <div className={styles.lessonDescription}>{lesson.description}</div>
                  )}
                </div>
                <span className={`${styles.lessonStatus} ${isCompleted ? styles.statusComplete : styles.statusIncomplete}`}>
                  {isCompleted ? '완료' : '미완료'}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
