import { home } from '@/content/home';

export function getProgramEnrollment(courseId: string, cohorts: { id: string; course_id: string }[], enrolledCohortIds: string[]) {
  const cohort = cohorts.find(cohort => cohort.course_id === courseId && enrolledCohortIds.includes(cohort.id));
  return cohort ? {
    badge: home.programs.enrolled,
    label: home.programs.curriculum,
    href: `/courses/${courseId}/cohorts/${cohort.id}/curriculum`,
  } : null;
}
