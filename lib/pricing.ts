import { Cohort } from './database.types';
import { PricingPlan } from '@/content/pricing/types';

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
    plan.match.length > 0 && cohort.title.toLowerCase().includes(plan.match.toLowerCase());
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
  const title = cohort.title.toLowerCase();
  const plan = plans.find(item => item.match.length > 0 && title.includes(item.match.toLowerCase()));
  return plan?.checkoutUrl ?? null;
}
