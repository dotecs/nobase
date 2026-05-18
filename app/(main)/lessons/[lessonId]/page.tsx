import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, ErrorPage } from '@/components';
import LessonClient from './LessonClient';
import LessonResources from './LessonResources';
import LessonImages from './LessonImages';
import CourseSidebar from './CourseSidebar';
import CourseTopBar from './CourseTopBar';
import VideoControlBar from './VideoControlBar';
import ContentTabs from './ContentTabs';
import VideoPlayer from './VideoPlayer';
import QuestionSection from './QuestionSection';
import { STORAGE_BUCKETS } from '@/lib/storage';
import styles from './lesson.module.css';
import { Resource, Profile, Lesson, LessonProgress, LessonVideo } from '@/lib/database.types';

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

  // 공개 예정일 체크
  if (lesson.available_at) {
    const availableDate = new Date(lesson.available_at);
    const now = new Date();
    if (availableDate > now) {
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

  // 전체 레슨 목록
  const { data: allLessonsData } = await supabase
    .from('lessons')
    .select('id, title, sort_order, is_published, available_at, subject_id')
    .eq('course_id', course.id)
    .order('sort_order', { ascending: true });

  const allLessons = (allLessonsData || []) as {
    id: string;
    title: string;
    sort_order: number;
    is_published: boolean;
    available_at: string | null;
    subject_id: string | null;
  }[];

  // 코스의 모든 비디오 (사이드바 시간 표시 + 총 강의시간 계산용)
  const lessonIds = allLessons.map((l) => l.id);
  const { data: courseVideosData } = lessonIds.length > 0
    ? await supabase
        .from('lesson_videos')
        .select('lesson_id, duration_seconds, is_main')
        .in('lesson_id', lessonIds)
    : { data: [] };
  const courseVideos = (courseVideosData || []) as Pick<LessonVideo, 'lesson_id' | 'duration_seconds' | 'is_main'>[];

  // lesson별 합산 duration (메인 영상 우선, 없으면 전체 합)
  const lessonDurationMap: Record<string, number> = {};
  courseVideos.forEach((v) => {
    if (v.duration_seconds == null) return;
    lessonDurationMap[v.lesson_id] = (lessonDurationMap[v.lesson_id] || 0) + v.duration_seconds;
  });

  const allLessonsWithDuration = allLessons.map((l) => ({
    ...l,
    duration_seconds: lessonDurationMap[l.id] || 0,
  }));

  const totalDurationSec = Object.values(lessonDurationMap).reduce((a, b) => a + b, 0);

  // 과목 목록
  const { data: subjectsData } = await supabase
    .from('subjects')
    .select('id, title')
    .eq('course_id', course.id)
    .order('sort_order', { ascending: true });

  const subjects = (subjectsData || []) as { id: string; title: string }[];

  // 이전/다음 레슨 (공개된 것만)
  const publishedLessons = allLessons.filter((l) => l.is_published);
  const currentIndex = publishedLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? publishedLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < publishedLessons.length - 1
      ? publishedLessons[currentIndex + 1]
      : null;

  // 완료된 레슨 ID
  const { data: allProgressData } = lessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('lesson_id', lessonIds)
    : { data: [] };

  const completedLessonIds = new Set(
    (allProgressData || []).map((p: { lesson_id: string }) => p.lesson_id)
  );

  // 진도율 / 수강시간 계산
  const publishedTotal = publishedLessons.length || 1;
  const progressRate = (completedLessonIds.size / publishedTotal) * 100;
  const watchedSeconds = Array.from(completedLessonIds).reduce(
    (sum, id) => sum + (lessonDurationMap[id] || 0),
    0
  );

  // 현재 레슨 영상 목록
  const { data: videosData } = await supabase
    .from('lesson_videos')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('is_main', { ascending: false })
    .order('sort_order', { ascending: true });

  const lessonVideos = (videosData || []) as LessonVideo[];
  const mainVideo = lessonVideos.find((v) => v.is_main) || lessonVideos[0] || null;
  const subVideos = lessonVideos.filter(
    (v) =>
      !v.is_main ||
      (v.is_main && lessonVideos.filter((x) => x.is_main).length > 1 && v.id !== mainVideo?.id)
  );

  const allResources = (lesson.resources || []) as Resource[];

  // 이미지 자료는 inline 표시용으로 분리, signed URL 갱신
  const rawImages = allResources.filter((r) => r.type === 'image');
  const nonImageResources = allResources.filter((r) => r.type !== 'image');

  const imageResources = await Promise.all(
    rawImages.map(async (img) => {
      if (!img.storage_path) return img;
      const { data } = await supabase.storage
        .from(STORAGE_BUCKETS.LESSON_RESOURCES)
        .createSignedUrl(img.storage_path, 60 * 60 * 24); // 24h
      return data?.signedUrl ? { ...img, url: data.signedUrl } : img;
    })
  );

  const courseHomeHref = `/courses/${course.id}/cohorts/${cohort.id}`;

  return (
    <div className={styles.coursePage}>
      <CourseTopBar
        courseTitle={course.title}
        backHref={courseHomeHref}
        progressRate={progressRate}
        watchedSeconds={watchedSeconds}
        totalSeconds={totalDurationSec}
      />

      <div className={styles.courseLayout}>
        <main className={styles.courseMain}>
          <div className={styles.videoFrame}>
            <VideoPlayer mainVideo={mainVideo} subVideos={subVideos} lessonTitle={lesson.title} />
            {imageResources.length > 0 && (
              <LessonImages images={imageResources as any} />
            )}
          </div>

          <VideoControlBar
            prevLesson={prevLesson}
            nextLesson={nextLesson}
            fallbackHref={courseHomeHref}
          />

          <div className={styles.lessonTitleRow}>
            <h2 className={styles.lessonTitleText}>{lesson.title}</h2>
            <LessonClient
              lessonId={lessonId}
              userId={user.id}
              isCompleted={progress?.completed || false}
            />
          </div>

          <ContentTabs
            resourcesContent={
              nonImageResources.length > 0 ? (
                <LessonResources resources={nonImageResources} lessonId={lessonId} />
              ) : undefined
            }
            introContent={
              lesson.description ? (
                <p className={styles.introText}>{lesson.description}</p>
              ) : undefined
            }
          />

          <QuestionSection lessonId={lessonId} userId={user.id} />
        </main>

        <CourseSidebar
          lessons={allLessonsWithDuration}
          subjects={subjects}
          currentLessonId={lessonId}
          completedLessonIds={completedLessonIds}
        />
      </div>
    </div>
  );
}
