import { cache } from 'react';
import { createServerSupabaseClient } from './supabase-server';
import { Course, Cohort, Database } from './database.types';

export type PublicLesson = Database['public']['Views']['lessons_public']['Row'];
export type PublicSubject = { id: string; title: string; sort_order: number };

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function courseHref(course: { id: string; slug: string | null }) {
  return `/courses/${course.slug ?? course.id}`;
}

export const resolveCourse = cache(async (param: string): Promise<Course | null> => {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('courses').select('*')
    .eq(isUuid(param) ? 'id' : 'slug', param).maybeSingle();
  if (error) throw error;
  return data as Course | null;
});

export const getPublicCurriculum = cache(async (courseId: string, client?: Awaited<ReturnType<typeof createServerSupabaseClient>>) => {
  const supabase = client ?? await createServerSupabaseClient();
  const [subjectsResult, lessonsResult] = await Promise.all([
    supabase.from('subjects').select('id, title, sort_order')
      .eq('course_id', courseId).eq('is_published', true).eq('visibility', 'public')
      .order('sort_order'),
    supabase.from('lessons_public')
      .select('id, course_id, subject_id, title, description, sort_order, is_free, available_at, created_at')
      .eq('course_id', courseId),
  ]);
  if (subjectsResult.error) throw subjectsResult.error;
  if (lessonsResult.error) throw lessonsResult.error;
  const subjects = (subjectsResult.data || []) as PublicSubject[];
  const subjectOrder = new Map(subjects.map(subject => [subject.id, subject.sort_order]));
  const lessons = ((lessonsResult.data || []) as PublicLesson[]).sort((a, b) => {
    const aOrder = a.subject_id ? subjectOrder.get(a.subject_id) ?? Infinity : Infinity;
    const bOrder = b.subject_id ? subjectOrder.get(b.subject_id) ?? Infinity : Infinity;
    return (aOrder === bOrder ? 0 : aOrder < bOrder ? -1 : 1)
      || a.sort_order - b.sort_order
      || a.created_at.localeCompare(b.created_at)
      || a.id.localeCompare(b.id);
  });
  return { subjects, lessons };
});

export const getFirstFreeLesson = cache(async (courseId: string, client?: Awaited<ReturnType<typeof createServerSupabaseClient>>) => {
  const { lessons } = await (client ? getPublicCurriculum(courseId, client) : getPublicCurriculum(courseId));
  return lessons.find(lesson => lesson.is_free) ?? null;
});

export function getCourseCta(
  course: Course,
  cohorts: Cohort[],
  firstFreeLesson: PublicLesson | null,
  activeCohortId: string | null,
  isLoggedIn: boolean,
) {
  if (activeCohortId) {
    return { label: '이어서 학습하기', href: `/courses/${course.id}/cohorts/${activeCohortId}/curriculum` };
  }
  if (cohorts.length) {
    return { label: '수강 신청', href: `${courseHref(course)}/enroll/${cohorts[0].id}` };
  }
  if (firstFreeLesson) {
    return { label: '무료 레슨 보기', href: `${courseHref(course)}/free/${firstFreeLesson.id}` };
  }
  return {
    label: '다음 기수 알림 받기',
    href: isLoggedIn ? null : `/login?returnTo=${encodeURIComponent(courseHref(course))}`,
  };
}
