import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FaLock } from 'react-icons/fa';
import { Header } from '@/components';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { courseHref, resolveCourse, getPublicCurriculum, getFirstFreeLesson, getCourseCta } from '@/lib/courses';
import { Cohort, LessonVideo, Profile } from '@/lib/database.types';
import styles from './free.module.css';

interface PageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseId, lessonId } = await params;
  const course = await resolveCourse(courseId);
  if (!course?.is_published) return { robots: { index: false, follow: false } };
  const [{ lessons }, first] = await Promise.all([
    getPublicCurriculum(course.id), getFirstFreeLesson(course.id),
  ]);
  const lesson = lessons.find(item => item.id === lessonId && item.is_free);
  if (!lesson) return { robots: { index: false, follow: false } };
  return {
    title: `${lesson.title} | ${course.title}`,
    description: lesson.description || undefined,
    robots: { index: lesson.id === first?.id, follow: lesson.id === first?.id },
  };
}

export default async function FreeLessonPage({ params }: PageProps) {
  const { courseId, lessonId } = await params;
  const [course, user, profileData] = await Promise.all([
    resolveCourse(courseId), getUser(), getProfile(),
  ]);
  if (!course?.is_published) notFound();
  const supabase = await createServerSupabaseClient();
  const [{ lessons }, first, cohortsResult, enrollmentResult] = await Promise.all([
    getPublicCurriculum(course.id),
    getFirstFreeLesson(course.id),
    supabase.from('cohorts').select('*').eq('course_id', course.id).order('created_at'),
    user ? supabase.from('enrollments').select('cohort_id').eq('user_id', user.id).eq('status', 'active')
      : Promise.resolve({ data: [], error: null }),
  ]);
  // The public view already excludes unpublished lessons/courses and private subjects.
  const lesson = lessons.find(item => item.id === lessonId && item.is_free);
  if (!lesson) notFound();
  if (cohortsResult.error) throw cohortsResult.error;
  if (enrollmentResult.error) throw enrollmentResult.error;
  const allCohorts = (cohortsResult.data || []) as Cohort[];
  const enrolledIds = new Set(((enrollmentResult.data || []) as { cohort_id: string }[]).map(item => item.cohort_id));
  const activeCohortId = allCohorts.find(cohort => enrolledIds.has(cohort.id))?.id ?? null;
  if (user && activeCohortId) redirect(`/lessons/${lesson.id}`);
  const href = `${courseHref(course)}/free/${lesson.id}`;
  if (!user && lesson.id !== first?.id) redirect(`/login?returnTo=${encodeURIComponent(href)}`);

  // Do not query or serialize video URLs until after the server-side gate.
  const { data: videoData, error: videoError } = await supabase.from('lesson_videos')
    .select('id, title, video_url, is_main, sort_order, description')
    .eq('lesson_id', lesson.id).eq('is_main', true).order('sort_order').limit(1).maybeSingle();
  if (videoError) throw videoError;
  const profile = profileData as Profile | null;
  const cta = getCourseCta(course, allCohorts.filter(cohort => cohort.is_active), first, activeCohortId, !!user);

  return (
    <div className={styles.page}>
      <Header isLoggedIn={!!user} userName={profile?.name || user?.email} userRole={profile?.role} />
      <main className={styles.main}>
        <Link className={styles.back} href={courseHref(course)}>← {course.title}</Link>
        <h1 className={styles.title}>{lesson.title}</h1>
        <VideoPlayer key={lesson.id} mainVideo={videoData as LessonVideo | null} subVideos={[]}
          lessonTitle={lesson.title} lessonId={lesson.id} disableProgress />
        {lesson.description && <p className={styles.description}>{lesson.description}</p>}
        <section className={styles.section}>
          <h2>이 강좌의 무료 레슨</h2>
          <ul className={styles.list}>{lessons.filter(item => item.is_free).map(item => {
            const locked = !user && item.id !== first?.id;
            return <li key={item.id}>
              <Link className={`${styles.lesson} ${item.id === lesson.id ? styles.current : ''}`}
                href={`${courseHref(course)}/free/${item.id}`} aria-current={item.id === lesson.id ? 'page' : undefined}>
                <span>{item.title}</span>
                {locked && <span className={styles.status}><FaLock aria-hidden="true" /> 로그인 후 보기</span>}
                {item.id === lesson.id && <span className={styles.status}>현재 레슨</span>}
              </Link>
            </li>;
          })}</ul>
        </section>
        <section className={styles.section}>
          <h2>{course.title}</h2>
          {cta.href ? <Link className={styles.cta} href={cta.href}>{cta.label}</Link>
            : <p>다음 기수 모집 일정은 추후 안내됩니다.</p>}
        </section>
      </main>
    </div>
  );
}
