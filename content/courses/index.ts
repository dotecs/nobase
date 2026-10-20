import brainTraining100 from './brain-training-100';
import { CourseLanding } from './types';

// 실제 courses.slug 기준의 정적 매핑.
const landings: Record<string, CourseLanding> = {
  'n-training': brainTraining100,
};

export function getCourseLanding(slug: string): CourseLanding | null {
  return Object.prototype.hasOwnProperty.call(landings, slug) ? landings[slug] : null;
}
