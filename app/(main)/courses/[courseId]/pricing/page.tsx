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
import { matchPricingPlans } from '@/lib/pricing';
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
  const cards = matchPricingPlans((cohortResult.data || []) as Cohort[], content?.plans || []);
  const enrolled = new Set(((enrollmentResult.data || []) as { cohort_id: string }[]).map(item => item.cohort_id));
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

        {cards.length ? <div className={styles.grid}>
          {cards.map(({ cohort, plan }) => {
            const isEnrolled = enrolled.has(cohort.id);
            return <article key={cohort.id} className={`${styles.card} ${plan?.highlight ? styles.highlight : ''}`}>
              <div className={styles.cardHeading}>
                {plan && <Image className={styles.planIcon} src={plan.icon} alt="" width={80} height={80} />}
                {plan && <p className={styles.eyebrow}>{plan.eyebrow}</p>}
                <h2>{plan?.name ?? cohort.title}</h2>
                {plan && <p className={styles.tagline}>{plan.tagline}</p>}
              </div>
              <div className={styles.priceBlock}>
                {cohort.original_price != null && cohort.original_price > cohort.price && <del className={styles.originalPrice}>{cohort.original_price.toLocaleString('ko-KR')}원</del>}
                <p className={styles.price}>{cohort.price.toLocaleString('ko-KR')}<span>원</span></p>
                {cohort.max_students != null && <p className={styles.capacity}>정원 {cohort.max_students}명</p>}
              </div>
              {plan && <ul className={styles.features}>{plan.features.map(feature => <li key={feature.text}>
                <span className={styles.check} aria-hidden="true">✓</span>
                {feature.emphasis ? <strong>{feature.text}</strong> : <span>{feature.text}</span>}
              </li>)}</ul>}
              <Link className={styles.button} href={isEnrolled
                ? `/courses/${course.id}/cohorts/${cohort.id}/curriculum`
                : `${courseHref(course)}/enroll/${cohort.id}`}>
                {isEnrolled ? '이어서 학습하기' : '등록하기'}<span aria-hidden="true">›</span>
              </Link>
            </article>;
          })}
        </div> : <section className={styles.empty}>
          <h2>현재 모집 중인 기수가 없습니다</h2>
          {!user && <Link className={styles.button} href={`/login?returnTo=${encodeURIComponent(path)}`}>다음 기수 알림 받기</Link>}
        </section>}

        {content && <section className={styles.benefits}>
          <div className={styles.benefitHeading}>
            <h2>{content.commonBenefits.title}</h2>
            <p>{content.commonBenefits.subtitle}</p>
          </div>
          {content.commonBenefits.items.map(item => <div className={styles.benefit} key={item.title}>
            <Image src={item.icon} width={48} height={48} alt="" />
            <div><h3>{item.title}</h3><p>{item.description}</p></div>
          </div>)}
        </section>}
        {content?.footnote && <p className={styles.footnote}>{content.footnote}</p>}
        <Link className={styles.back} href={courseHref(course)}>← 커리큘럼 소개로</Link>
      </main>
    </div>
  );
}
