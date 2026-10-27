import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';

export type LearnAccess = { granted: boolean; reason: 'admin' | 'enrolled' | 'not_enrolled' | 'anonymous' };

export async function hasLearnAccess(userId: string | null | undefined): Promise<LearnAccess> {
  if (!userId) return { granted: false, reason: 'anonymous' };
  const client = await createServerSupabaseClient();
  const profile = await client.from('profiles').select('role').eq('user_id', userId).single();
  if ((profile.data as { role: string } | null)?.role === 'admin') return { granted: true, reason: 'admin' };
  const result = await createAdminSupabaseClient().from('enrollments')
    .select('id, cohort:cohorts!inner(course:courses!inner(slug))')
    .eq('user_id', userId).eq('status', 'active').eq('cohort.course.slug', 'root-math');
  const rows = (result.data ?? []) as unknown as { cohort: { course: { slug: string } | null } | null }[];
  if (!result.error && rows.some(row => row.cohort?.course?.slug === 'root-math')) return { granted: true, reason: 'enrolled' };
  return { granted: false, reason: 'not_enrolled' };
}
