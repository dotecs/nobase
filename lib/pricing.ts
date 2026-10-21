import { Cohort } from './database.types';
import { PricingPlan } from '@/content/pricing/types';
import { bookingContent } from '@/content/booking';

export function matchesPricingKeyword(title: string, keyword: string): boolean {
  return keyword.length > 0 && title.toLowerCase().includes(keyword.toLowerCase());
}

export function isBookingEligible(cohorts: readonly Pick<Cohort, 'title'>[]): boolean {
  return cohorts.some(cohort => bookingContent.eligibleKeywords.some(keyword => matchesPricingKeyword(cohort.title, keyword)));
}

export interface PricingCard {
  cohort: Cohort;
  plan: PricingPlan | null;
}

export function matchPricingPlans(cohorts: readonly Cohort[], plans: readonly PricingPlan[]): PricingCard[] {
  const active = cohorts.filter(cohort => cohort.is_active).sort((a, b) => {
    const aStart = a.starts_at ? Date.parse(a.starts_at) : Infinity;
    const bStart = b.starts_at ? Date.parse(b.starts_at) : Infinity;
    return (aStart === bStart ? 0 : aStart < bStart ? -1 : 1)
      || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
  });
  const matches = (cohort: Cohort, plan: PricingPlan) =>
    matchesPricingKeyword(cohort.title, plan.match);
  const cards: PricingCard[] = [];
  const selected = new Set<string>();
  for (const plan of plans) {
    const cohort = active.find(item => !selected.has(item.id) && matches(item, plan));
    if (cohort) {
      cards.push({ cohort, plan });
      selected.add(cohort.id);
    }
  }
  for (const cohort of active) {
    if (!plans.some(plan => matches(cohort, plan))) cards.push({ cohort, plan: null });
  }
  return cards;
}

/** 홈·카탈로그용: 기수에 맞는 플랜의 외부 결제 URL. 없으면 null (호출부는 가격 페이지로 폴백). */
export function getCohortCheckoutUrl(cohort: Pick<Cohort, 'title'>, plans: readonly PricingPlan[] | undefined): string | null {
  if (!plans) return null;
  const plan = plans.find(item => matchesPricingKeyword(cohort.title, item.match));
  return plan?.checkoutUrl ?? null;
}
