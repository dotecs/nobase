import { cache } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { programs, type ProgramEntry, type ProgramStatus } from '@/content/programs';
import { courseHref } from './courses';
import type { Database, Course } from './database.types';

// Unregistered public courses have no category and appear only in the all filter.
export interface ProgramView extends Omit<ProgramEntry, 'category'> {
  category: ProgramEntry['category'] | null;
  status: ProgramStatus;
  href: string | null;
  courseId: string | null;
}
export function publicAsset(src: string | null): string | null {
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return src;
  return existsSync(path.join(process.cwd(), 'public', src)) ? src : null;
}
export const getPrograms = cache(async (client?: SupabaseClient<Database>): Promise<ProgramView[]> => {
  // Public discovery always uses the anon key, without a user's cookies/session.
  const supabase = client ?? createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.from('courses')
    .select('id, slug, title, description, thumbnail_url, cohorts(is_active)')
    .eq('is_published', true).order('created_at');
  if (error) throw error;
  const courses = (data ?? []) as (Pick<Course, 'id' | 'slug' | 'title' | 'description' | 'thumbnail_url'> & { cohorts: { is_active: boolean }[] })[];
  const views: ProgramView[] = [...programs].sort((a, b) => a.sortOrder - b.sortOrder).map(entry => {
    const course = courses.find(course => course.slug === entry.slug);
    const comingSoon = entry.comingSoon || !course;
    return { ...entry, status: comingSoon ? 'comingSoon' : course.cohorts.some(cohort => cohort.is_active) ? 'open' : 'closed',
      href: comingSoon ? null : courseHref(course), courseId: course?.id ?? null,
      thumbnail: publicAsset(course?.thumbnail_url || entry.thumbnail) };
  });
  for (const course of courses.filter(course => !programs.some(entry => entry.slug === course.slug))) {
    console.warn(`[programs] Public course missing from registry: ${course.slug ?? course.id}`);
    views.push({ slug: course.slug ?? course.id, title: course.title, category: null, audience: '', summary: course.description ?? '',
      thumbnail: publicAsset(course.thumbnail_url), sortOrder: views.length + 1,
      status: course.cohorts.some(cohort => cohort.is_active) ? 'open' : 'closed', href: courseHref(course), courseId: course.id });
  }
  return views;
});
