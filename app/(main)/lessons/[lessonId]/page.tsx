import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, ErrorPage } from '@/components';
import LessonClient from './LessonClient';
import LessonResources from './LessonResources';
import VideoPlayer from './VideoPlayer';
import styles from './lesson.module.css';
import { Resource, Profile, Lesson, LessonProgress, LessonVideo } from '@/lib/database.types';
import { FaPaperclip } from 'react-icons/fa';

interface LessonPageProps {
  params: Promise<{
    lessonId: string;
  }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const profileData = await getProfile();
  const profile = profileData as Profile | null;
  const supabase = await createServerSupabaseClient();

  // 레슨 조회
  const { data: lessonData } = await supabase
    .from('lessons')
    .select(`
      *,
      courses (*)
    `)
    .eq('id', lessonId)
    .single();

  const lesson = lessonData as (Lesson & { courses: any }) | null;

  if (!lesson) {
    notFound();
  }

  const course = lesson?.courses as any;

  // 공개 예정일 체크 (available_at이 설정되어 있고 아직 도래하지 않은 경우)
  if (lesson.available_at) {
    const availableDate = new Date(lesson.available_at);
    const now = new Date();
    if (availableDate > now) {
      const profileData = await getProfile();
      const profile = profileData as Profile | null;
      
      const formattedDate = availableDate.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <div className={styles.page}>
          <Header userName={profile?.name || user.email} isLoggedIn={true} userRole={profile?.role} />
          <ErrorPage
            icon="clock"
            title="아직 공개되지 않은 레슨입니다"
            description={`이 레슨은 ${formattedDate}에 공개될 예정입니다.`}
            primaryAction={{
              label: '대시보드로 이동',
              href: '/dashboard',
            }}
          />
        </div>
      );
    }
  }

  // 등록 확인
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*, cohorts!inner(id, course_id)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('cohorts.course_id', course.id)
    .limit(1)
    .maybeSingle();

  const cohort = (enrollment as any)?.cohorts as { id: string; course_id: string } | null;

  if (!enrollment || !cohort) {
    return (
      <div className={styles.page}>
        <Header userName={profile?.name || user.email} isLoggedIn={true} userRole={profile?.role} />
        <ErrorPage
          icon="lock"
          title="접근 권한이 없습니다"
          description="이 레슨에 대한 수강 등록이 필요합니다."
          primaryAction={{
            label: '대시보드로 이동',
            href: '/dashboard',
          }}
        />
      </div>
    );
  }

  // 진도 조회
  const { data: progressData } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .single();

  const progress = progressData as LessonProgress | null;

  // 전체 레슨 목록 (이전/다음 레슨용)
  const { data: allLessonsData } = await supabase
    .from('lessons')
    .select('id, title, sort_order')
    .eq('course_id', course.id)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  const allLessons = (allLessonsData || []) as { id: string; title: string; sort_order: number }[];

  const currentIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // 레슨 영상 목록 조회
  const { data: videosData } = await supabase
    .from('lesson_videos')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('is_main', { ascending: false })
    .order('sort_order', { ascending: true });

  const lessonVideos = (videosData || []) as LessonVideo[];
  const mainVideo = lessonVideos.find(v => v.is_main) || lessonVideos[0] || null;
  const subVideos = lessonVideos.filter(v => !v.is_main || (v.is_main && lessonVideos.filter(x => x.is_main).length > 1 && v.id !== mainVideo?.id));

  const resources = (lesson.resources || []) as Resource[];

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
            href={`/courses/${course.id}/cohorts/${cohort.id}`}
            className={styles.breadcrumbLink}
          >
            {course.title}
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link 
            href={`/courses/${course.id}/cohorts/${cohort.id}/curriculum`}
            className={styles.breadcrumbLink}
          >
            커리큘럼
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span>레슨 {currentIndex + 1}</span>
        </nav>

        <div className={styles.lessonHeader}>
          <span className={styles.lessonNumber}>
            레슨 {currentIndex + 1} / {allLessons.length}
          </span>
          <h1 className={styles.lessonTitle}>{lesson.title}</h1>
          {lesson.description && (
            <p className={styles.lessonDescription}>{lesson.description}</p>
          )}
        </div>

        <div className={styles.videoContainer}>
          <VideoPlayer 
            mainVideo={mainVideo}
            subVideos={subVideos}
            lessonTitle={lesson.title}
          />
        </div>

        <LessonClient
          lessonId={lessonId}
          userId={user.id}
          isCompleted={progress?.completed || false}
        />

        {resources.length > 0 && (
          <div className={styles.resourcesCard}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><FaPaperclip /></span>
              학습 자료
            </h2>
            <LessonResources resources={resources} lessonId={lessonId} />
          </div>
        )}

        <div className={styles.navigation}>
          {prevLesson ? (
            <Link 
              href={`/lessons/${prevLesson.id}`}
              className={styles.navButton}
            >
              ← 이전 레슨
            </Link>
          ) : (
            <span className={`${styles.navButton} ${styles.navButtonDisabled}`}>
              ← 이전 레슨
            </span>
          )}

          {nextLesson ? (
            <Link 
              href={`/lessons/${nextLesson.id}`}
              className={styles.navButton}
            >
              다음 레슨 →
            </Link>
          ) : (
            <Link 
              href={`/courses/${course.id}/cohorts/${cohort.id}`}
              className={styles.navButton}
            >
              강좌 홈으로 →
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
