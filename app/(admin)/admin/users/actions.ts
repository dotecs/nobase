'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export type EnrollStatus = 'active' | 'paused';

export type EnrollUsersResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

/**
 * 관리자가 선택한 사용자들을 특정 기수에 등록한다.
 * - DB RLS(enrollments_admin_all / is_admin())가 1차 방어, 여기서 role 재확인이 2차 방어
 * - 이미 같은 기수에 등록된 사용자는 건너뜀 (UNIQUE(user_id, cohort_id))
 */
export async function enrollUsersInCohort(
  userIds: string[],
  cohortId: string,
  status: EnrollStatus = 'active',
): Promise<EnrollUsersResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServerSupabaseClient()) as any;

  const {
    data: { user: actor },
  } = await supabase.auth.getUser();
  if (!actor) return { ok: false, error: '로그인이 필요합니다.' };

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', actor.id)
    .single();
  if (actorProfile?.role !== 'admin') return { ok: false, error: '관리자만 등록할 수 있습니다.' };

  const ids = Array.from(new Set(userIds.filter((v) => typeof v === 'string' && v.length > 0)));
  if (ids.length === 0) return { ok: false, error: '등록할 사용자를 선택해 주세요.' };
  if (!cohortId) return { ok: false, error: '등록할 기수를 선택해 주세요.' };
  if (status !== 'active' && status !== 'paused') return { ok: false, error: '잘못된 상태 값입니다.' };

  // 기수 존재 확인
  const { data: cohort } = await supabase.from('cohorts').select('id').eq('id', cohortId).maybeSingle();
  if (!cohort) return { ok: false, error: '기수를 찾을 수 없습니다.' };

  // 이미 등록된 사용자 제외
  const { data: existing } = await supabase
    .from('enrollments')
    .select('user_id')
    .eq('cohort_id', cohortId)
    .in('user_id', ids);
  const already = new Set((existing || []).map((e: { user_id: string }) => e.user_id));
  const toInsert = ids.filter((id) => !already.has(id));

  if (toInsert.length === 0) {
    return { ok: true, inserted: 0, skipped: ids.length };
  }

  const { error } = await supabase
    .from('enrollments')
    .insert(toInsert.map((user_id) => ({ user_id, cohort_id: cohortId, status })));

  if (error) {
    console.error('enrollUsersInCohort:', error);
    return { ok: false, error: '등록 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/enrollments');
  revalidatePath('/dashboard');

  return { ok: true, inserted: toInsert.length, skipped: ids.length - toInsert.length };
}
