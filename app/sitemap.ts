import { MetadataRoute } from 'next';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/database.types';
import { courseHref, getFirstFreeLesson } from '@/lib/courses';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = 'https://nobase911.com';
  // Never use a visitor's session or service-role credentials for public discovery.
  const anon = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
  const { data, error } = await anon.from('courses').select('id, slug')
    .eq('is_published', true).order('created_at', { ascending: false });
  if (error) throw error;
  const courses = (data || []) as { id: string; slug: string | null }[];
  const entries = await Promise.all(courses.map(async course => {
    const path = courseHref(course);
    const first = await getFirstFreeLesson(course.id, anon);
    return [
      { url: `${origin}${path}` },
      { url: `${origin}${path}/pricing` },
      ...(first ? [{ url: `${origin}${path}/free/${first.id}` }] : []),
    ];
  }));
  return [{ url: origin }, { url: `${origin}/courses` }, ...entries.flat()];
}
