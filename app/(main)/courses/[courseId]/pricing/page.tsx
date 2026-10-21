import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Header } from '@/components';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Cohort, Profile } from '@/lib/database.types';
import { resolveCourse, isUuid, courseHref } from '@/lib/courses';
import { getPricingContent } from '@/content/pricing';
import PricingPlans from '@/components/pricing/PricingPlans';
import styles from './pricing.module.css';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const course = await resolveCourse((await params).courseId);
  if (!course?.is_published) notFound();
  const content = getPricingContent(course.slug);
  const title = `${course.title} 플랜·가격 | 노베이스구조대`;
  const description = content?.hero.subtitle ?? course.description ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(content ? { images: [new URL(content.hero.brandImage, 'https://nobase911.com').href] } : {}),
    },
  };
}

export default async function PricingPage({ params }: PageProps) {
  const { courseId } = await params;
  const [course, user, profileData] = await Promise.all([
    resolveCourse(courseId), getUser(), getProfile(),
  ]);
  if (!course?.is_published) notFound();
  const path = `${courseHref(course)}/pricing`;
  if (isUuid(courseId) && course.slug && course.slug !== courseId) redirect(path);
  const supabase = await createServerSupabaseClient();
  const [cohortResult, enrollmentResult] = await Promise.all([
    supabase.from('cohorts').select('*').eq('course_id', course.id).eq('is_active', true)
      .order('starts_at', { ascending: true, nullsFirst: false }).order('created_at'),
    user ? supabase.from('enrollments').select('cohort_id').eq('user_id', user.id).eq('status', 'active')
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (cohortResult.error) throw cohortResult.error;
  if (enrollmentResult.error) throw enrollmentResult.error;
  const content = getPricingContent(course.slug);
  const profile = profileData as Profile | null;

  return (
    <div className={styles.page} style={content ? { '--hero-background': `url("${content.hero.background}")` } as CSSProperties : undefined}>
      <Header isLoggedIn={!!user} userName={profile?.name || user?.email} userRole={profile?.role} />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>{content ? <>{content.hero.title[0]}<br /><span>{content.hero.title[1]}</span></> : course.title}</h1>
            <p>{content?.hero.subtitle ?? course.description}</p>
          </div>
          {content && <Image className={styles.heroBrand} src={content.hero.brandImage} alt="" width={1200} height={600} priority sizes="(max-width: 700px) 90vw, 45vw" />}
        </section>

        <div id="plans"><PricingPlans course={course} cohorts={(cohortResult.data || []) as Cohort[]}
          enrolledIds={((enrollmentResult.data || []) as { cohort_id: string }[]).map(item => item.cohort_id)}
          content={content} isLoggedIn={!!user} /></div>
        <Link className={styles.back} href={courseHref(course)}>← 커리큘럼 소개로</Link>
      </main>
    </div>
  );
}
