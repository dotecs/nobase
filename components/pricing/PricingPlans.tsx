import Image from 'next/image';
import { pricingLabels } from '@/content/pricing/labels';
import Link from 'next/link';
import type { Cohort, Course } from '@/lib/database.types';
import type { PricingContent } from '@/content/pricing/types';
import { courseHref } from '@/lib/courses';
import { matchPricingPlans } from '@/lib/pricing';
import styles from './PricingPlans.module.css';

interface Props {
  course: Course;
  cohorts: Cohort[];
  enrolledIds: string[];
  content: PricingContent | null;
  isLoggedIn: boolean;
}

export default function PricingPlans({ course, cohorts, enrolledIds, content, isLoggedIn }: Props) {
  const cards = matchPricingPlans(cohorts, content?.plans || []);
  const enrolled = new Set(enrolledIds);
  const path = `${courseHref(course)}/pricing`;
  return <div className={styles.pricing}>
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
                {cohort.original_price != null && cohort.original_price > cohort.price && <del className={styles.originalPrice}>{cohort.original_price.toLocaleString('ko-KR')}{pricingLabels.currency}</del>}
                <p className={styles.price}>{cohort.price.toLocaleString('ko-KR')}<span>{pricingLabels.currency}</span></p>
                {cohort.max_students != null && <p className={styles.capacity}>{pricingLabels.capacity(cohort.max_students)}</p>}
              </div>
              {plan && <ul className={styles.features}>{plan.features.map(feature => <li key={feature.text}>
                <span className={styles.check} aria-hidden="true">✓</span>
                {feature.emphasis ? <strong>{feature.text}</strong> : <span>{feature.text}</span>}
              </li>)}</ul>}
              {isEnrolled ? (
                <Link className={styles.button} href={`/courses/${course.id}/cohorts/${cohort.id}/curriculum`}>
                  {pricingLabels.continue}<span aria-hidden="true">›</span>
                </Link>
              ) : plan?.checkoutUrl ? (
                <a className={styles.button} href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer">
                  {pricingLabels.register}<span aria-hidden="true">›</span>
                </a>
              ) : (
                <Link className={styles.button} href={`${courseHref(course)}/enroll/${cohort.id}`}>
                  {pricingLabels.register}<span aria-hidden="true">›</span>
                </Link>
              )}
            </article>;
          })}
        </div> : <section className={styles.empty}>
          <h2>{pricingLabels.empty}</h2>
          {!isLoggedIn && <Link className={styles.button} href={`/login?returnTo=${encodeURIComponent(path)}`}>{pricingLabels.notify}</Link>}
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
  </div>;
}
