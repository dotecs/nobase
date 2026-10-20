import { redirect, notFound } from 'next/navigation';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, ErrorPage } from '@/components';
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

  const supabase = await createServerSupabaseClient();

  // 레슨 조회
  const [{ data: lessonData }, profileData] = await Promise.all([
    supabase
      .from('lessons')
      .select(`
        *,
        courses (*)
      `)
      .eq('id', lessonId)
      .single(),
    getProfile(),
  ]);

  const profile = profileData as Profile | null;
  const lesson = lessonData as (Lesson & { courses: any }) | null;

  if (!lesson) {
    notFound();
  }

  const course = lesson?.courses as any;

  // 소속 subject가 restricted인데 접근 권한이 없으면 노출 금지
  let subjectResources: Resource[] = [];
  if (lesson.subject_id) {
    const { data: subjectAccess } = await supabase
      .from('subjects')
      .select('id, resources')
      .eq('id', lesson.subject_id)
      .maybeSingle();
    if (!subjectAccess) {
      notFound();
    }
    subjectResources = ((subjectAccess as { resources: unknown }).resources || []) as Resource[];
  }

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
  const [{ data: progressData }, { data: subjectsData }, { data: allLessonsData }, { data: videosData }] = await Promise.all([
    supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .single(),
    supabase
      .from('subjects')
      .select('id, title')
      .eq('course_id', course.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, title, sort_order, is_published, available_at, subject_id')
      .eq('course_id', course.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('lesson_videos')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('is_main', { ascending: false })
      .order('sort_order', { ascending: true }),
  ]);

  const progress = progressData as LessonProgress | null;

  // 과목 목록 — RLS가 visibility에 따라 자동 필터

  const subjects = (subjectsData || []) as { id: string; title: string }[];
  const visibleSubjectIds = new Set(subjects.map((s) => s.id));

  // 전체 레슨 목록 — 접근 불가한 subject 소속 lesson은 사이드바에서 제외

  const allLessons = ((allLessonsData || []) as {
    id: string;
    title: string;
    sort_order: number;
    is_published: boolean;
    available_at: string | null;
    subject_id: string | null;
  }[]).filter((l) => l.subject_id === null || visibleSubjectIds.has(l.subject_id));

  // 코스의 모든 비디오 (사이드바 시간 표시 + 총 강의시간 계산용)
  const lessonIds = allLessons.map((l) => l.id);
  const [{ data: courseVideosData }, { data: allProgressData }] = await Promise.all([
    lessonIds.length > 0
    ? supabase
        .from('lesson_videos')
        .select('lesson_id, duration_seconds, is_main')
        .in('lesson_id', lessonIds)
    : { data: [] },
    lessonIds.length > 0
    ? supabase
        .from('lesson_progress')
        .select('lesson_id, completed, max_position_seconds')
        .eq('user_id', user.id)
        .in('lesson_id', lessonIds)
    : { data: [] },
  ]);
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

  // 이전/다음 레슨 (공개된 것만)
  const publishedLessons = allLessons.filter((l) => l.is_published);
  const currentIndex = publishedLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? publishedLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < publishedLessons.length - 1
      ? publishedLessons[currentIndex + 1]
      : null;

  // 모든 진도 (완료 + 진행 중)

  type ProgressRow = {
    lesson_id: string;
    completed: boolean;
    max_position_seconds: number | null;
  };
  const progressRows = (allProgressData || []) as ProgressRow[];

  const completedLessonIds = new Set(
    progressRows.filter((p) => p.completed).map((p) => p.lesson_id)
  );

  // 진행률 맵 (0~100, 정수). 완료된 강의는 100, 미시청은 미포함
  const lessonProgressPercent: Record<string, number> = {};
  progressRows.forEach((p) => {
    if (p.completed) {
      lessonProgressPercent[p.lesson_id] = 100;
      return;
    }
    const duration = lessonDurationMap[p.lesson_id] || 0;
    const pos = p.max_position_seconds || 0;
    if (duration > 0 && pos > 0) {
      lessonProgressPercent[p.lesson_id] = Math.min(
        99,
        Math.max(1, Math.round((pos / duration) * 100))
      );
    }
  });

  // 진도율 / 수강시간 계산 — 부분 시청도 포함 (max_position_seconds 합산)
  const publishedTotal = publishedLessons.length || 1;
  const progressRate = (completedLessonIds.size / publishedTotal) * 100;
  const watchedSeconds = progressRows.reduce((sum, p) => {
    const duration = lessonDurationMap[p.lesson_id] || 0;
    if (duration === 0) return sum;
    if (p.completed) return sum + duration;
    const watched = Math.min(duration, p.max_position_seconds || 0);
    return sum + watched;
  }, 0);

  // 현재 레슨 영상 목록

  const lessonVideos = (videosData || []) as LessonVideo[];
  const mainVideo = lessonVideos.find((v) => v.is_main) || lessonVideos[0] || null;
  const subVideos = lessonVideos.filter(
    (v) =>
      !v.is_main ||
      (v.is_main && lessonVideos.filter((x) => x.is_main).length > 1 && v.id !== mainVideo?.id)
  );

  const lessonResources = (lesson.resources || []) as Resource[];

  // 과목 공통 자료를 먼저, 그 다음에 강의별 자료
  const allResources: Resource[] = [...subjectResources, ...lessonResources];

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
          {mainVideo ? (
            <div className={styles.videoFrame}>
              <VideoPlayer
              mainVideo={mainVideo}
              subVideos={subVideos}
              lessonTitle={lesson.title}
              lessonId={lessonId}
              initialPosition={progress?.last_position_seconds || 0}
            />
              {imageResources.length > 0 && (
                <LessonImages images={imageResources as any} />
              )}
            </div>
          ) : imageResources.length > 0 ? (
            <div className={styles.imagesOnlyFrame}>
              <LessonImages images={imageResources as any} />
            </div>
          ) : (
            <div className={styles.videoFrame}>
              <VideoPlayer
              mainVideo={mainVideo}
              subVideos={subVideos}
              lessonTitle={lesson.title}
              lessonId={lessonId}
              initialPosition={progress?.last_position_seconds || 0}
            />
            </div>
          )}

          <VideoControlBar
            prevLesson={prevLesson}
            nextLesson={nextLesson}
            fallbackHref={courseHomeHref}
          />

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
          lessonProgressPercent={lessonProgressPercent}
        />
      </div>
    </div>
  );
}
