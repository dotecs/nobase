import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Cohort, Profile } from '@/lib/database.types';
import { courseHref, resolveCourse, isUuid, getPublicCurriculum, getFirstFreeLesson, getCourseCta } from '@/lib/courses';
import { getCourseLanding } from '@/content/courses';
import TrainingLanding from '@/components/landing/TrainingLanding';
import styles from './course.module.css';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const course = await resolveCourse((await params).courseId);
  if (!course?.is_published) return {};
  const landing = course.slug ? getCourseLanding(course.slug) : null;
  return {
    title: `${course.title} | 노베이스구조대`,
    description: landing?.tagline || course.description || undefined,
    openGraph: {
      title: course.title,
      description: landing?.tagline || course.description || undefined,
      ...(course.thumbnail_url ? { images: [course.thumbnail_url] } : {}),
    },
  };
}

export default async function CourseLandingPage({ params }: PageProps) {
  const { courseId } = await params;
  const [course, user, profileData] = await Promise.all([
    resolveCourse(courseId), getUser(), getProfile(),
  ]);
  if (!course?.is_published) notFound();
  if (isUuid(courseId) && course.slug && course.slug !== courseId) {
    redirect(courseHref(course));
  }
  const supabase = await createServerSupabaseClient();
  const [cohortsResult, curriculum, enrollmentResult] = await Promise.all([
    supabase.from('cohorts').select('*').eq('course_id', course.id).order('created_at'),
    getPublicCurriculum(course.id),
    user
      ? supabase.from('enrollments').select('cohort_id').eq('user_id', user.id).eq('status', 'active')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (cohortsResult.error) throw cohortsResult.error;
  if (enrollmentResult.error) throw enrollmentResult.error;
  const allCohorts = (cohortsResult.data || []) as Cohort[];
  const cohorts = allCohorts.filter(cohort => cohort.is_active);
  const enrolledIds = new Set(((enrollmentResult.data || []) as { cohort_id: string }[]).map(row => row.cohort_id));
  const activeCohortId = allCohorts.find(cohort => enrolledIds.has(cohort.id))?.id ?? null;
  const firstFreeLesson = await getFirstFreeLesson(course.id);
  const cta = getCourseCta(course, cohorts, firstFreeLesson, activeCohortId, !!user);
  const profile = profileData as Profile | null;
  const landing = course.slug ? getCourseLanding(course.slug) : null;
  const { subjects, lessons } = curriculum;
  const freeLessons = lessons.filter(lesson => lesson.is_free);
  const publicLessons = lessons.filter(lesson =>
    lesson.subject_id === null || subjects.some(subject => subject.id === lesson.subject_id));
  const groups = subjects.map(subject => ({
    id: subject.id, title: subject.title,
    lessons: publicLessons.filter(lesson => lesson.subject_id === subject.id),
  }));
  const ungrouped = publicLessons.filter(lesson => lesson.subject_id === null);
  if (ungrouped.length) groups.push({ id: 'ungrouped', title: '기타', lessons: ungrouped });

  if (landing?.redesign) return <>
    <Header isLoggedIn={!!user} userName={profile?.name || user?.email} userRole={profile?.role}
      landingNavigation={landing.redesign.navigation}
      landingCta={{ label: landing.redesign.cta.header, href: landing.redesign.links.pricing }} />
    <TrainingLanding content={landing.redesign} course={course} cohorts={cohorts}
      enrolledIds={[...enrolledIds]} isLoggedIn={!!user} freeLessonId={firstFreeLesson?.id ?? null} curriculum={curriculum} />
  </>;

  return (
    <div className={styles.page}>
      <Header isLoggedIn={!!user} userName={profile?.name || user?.email} userRole={profile?.role} />
      <main className={styles.main}>
        <nav aria-label="현재 위치" className={styles.breadcrumb}>
          <Link href="/courses">커리큘럼</Link><span aria-hidden="true"> / </span>{course.title}
        </nav>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>커리큘럼 안내</p>
            <h1>{course.title}</h1>
            {(landing?.tagline || course.description) && <p className={styles.description}>{landing?.tagline || course.description}</p>}
            {cta.href ? <Link href={cta.href} className={styles.cta}>{cta.label}</Link>
              : <p className={styles.description}>다음 기수 모집 일정은 추후 안내됩니다.</p>}
          </div>
          {/* 외부 썸네일도 기존 강좌 설정 그대로 표시합니다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {course.thumbnail_url && <img className={styles.thumbnail} src={course.thumbnail_url} alt={course.title} />}
        </section>

        {freeLessons.length > 0 && <section className={styles.section}>
          <h2>무료 레슨</h2>
          <div className={styles.cards}>{freeLessons.map(lesson => (
            <Link key={lesson.id} href={`${courseHref(course)}/free/${lesson.id}`} className={styles.card}>
              <span className={styles.badge}>{lesson.id === firstFreeLesson?.id ? '로그인 없이 바로 보기' : '로그인 후 보기'}</span>
              <h3>{lesson.title}</h3>
            </Link>
          ))}</div>
        </section>}

        <section className={styles.section}>
          <h2>커리큘럼 목차</h2>
          <p className={styles.muted}>{subjects.length}개 과목 · {publicLessons.length}개 레슨</p>
          {groups.length ? groups.map(group => <div key={group.id} className={styles.subject}>
            <h3>{group.title}</h3>
            <ol>{group.lessons.map((lesson, index) => <li key={lesson.id}>
              <span className={styles.muted}>{index + 1}.</span>
              <span>{lesson.title}</span>
              {lesson.is_free && <span className={styles.badge}>무료</span>}
            </li>)}</ol>
          </div>) : <p className={styles.muted}>커리큘럼을 준비 중입니다.</p>}
        </section>

        {landing && <>
          {landing.audience.length > 0 && <section className={styles.section}><h2>이런 분을 위한 과정</h2><ul className={styles.bullets}>{landing.audience.map((text, i) => <li key={i}>{text}</li>)}</ul></section>}
          {landing.outcomes.length > 0 && <section className={styles.section}><h2>끝나면 할 수 있는 것</h2><ul className={styles.bullets}>{landing.outcomes.map((text, i) => <li key={i}>{text}</li>)}</ul></section>}
          {landing.body.map((section, i) => <section key={i} className={styles.section}><h2>{section.heading}</h2>{section.paragraphs.map((text, j) => <p key={j} className={styles.description}>{text}</p>)}</section>)}
          {landing.testimonials.length > 0 && <section className={styles.section}><h2>수강 후기</h2>{landing.testimonials.map((item, i) => <blockquote key={i} className={styles.card}><p>{item.text}</p><cite>{item.name}</cite></blockquote>)}</section>}
          {landing.faq.length > 0 && <section className={styles.section}><h2>자주 묻는 질문</h2>{landing.faq.map((item, i) => <details key={i} className={styles.subject}><summary>{item.q}</summary><p className={styles.description}>{item.a}</p></details>)}</section>}
        </>}

        <section className={styles.section}>
          <h2>모집 기수</h2>
          {cohorts.length ? <div>
            <p>플랜 {cohorts.length}개 · {Math.min(...cohorts.map(cohort => cohort.price)).toLocaleString('ko-KR')}원부터</p>
            <Link href={`${courseHref(course)}/pricing`} className={styles.cta}>플랜·가격 보기 →</Link>
          </div> : user
            ? <p className={styles.muted}>다음 기수 모집 일정은 추후 안내됩니다.</p>
            : <Link className={styles.cta} href={`/login?returnTo=${encodeURIComponent(courseHref(course))}`}>다음 기수 알림 받기</Link>}
        </section>
      </main>
    </div>
  );
}
