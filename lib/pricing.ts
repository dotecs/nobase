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
