import training from './n-training';
import { CourseLanding } from './types';

// 실제 courses.slug 기준의 정적 매핑.
const landings: Record<string, CourseLanding> = {
  'n-training': training,
};

export function getCourseLanding(slug: string): CourseLanding | null {
  return Object.prototype.hasOwnProperty.call(landings, slug) ? landings[slug] : null;
}
