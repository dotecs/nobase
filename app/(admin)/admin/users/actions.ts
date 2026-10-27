'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { canTransition, ENROLLMENT_STATUS_LABEL } from '@/lib/enrollment-status';

export async function updateEnrollmentStatus(input: { enrollmentId: string; to: 'active' | 'on_hold' | 'ended'; reason: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z.object({ enrollmentId: z.uuid(), to: z.enum(['active', 'on_hold', 'ended']), reason: z.string().trim().min(2).max(200) }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, error: '상태와 수강 정보를 확인하고 사유를 2~200자로 입력해 주세요.' };
  let changed = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: actor }, error: authError } = await supabase.auth.getUser();
    if (authError || !actor) return { ok: false, error: '로그인이 필요합니다.' };
    const profile = await supabase.from('profiles').select('role').eq('user_id', actor.id).single();
    if (profile.error || (profile.data as { role: string } | null)?.role !== 'admin') return { ok: false, error: '관리자만 상태를 변경할 수 있습니다.' };
    const current = await supabase.from('enrollments').select('id,status').eq('id', parsed.data.enrollmentId).maybeSingle();
    const row = current.data as { id: string; status: string } | null;
    if (current.error || !row) return { ok: false, error: '수강 정보를 찾을 수 없습니다.' };
    const { to, reason } = parsed.data;
    if (!canTransition(row.status, to)) return { ok: false, error: `현재 상태 ${ENROLLMENT_STATUS_LABEL[row.status] ?? row.status}에서 ${ENROLLMENT_STATUS_LABEL[to]}로 바꿀 수 없습니다` };
    const result = await supabase.from('enrollments').update({ status: to } as never).eq('id', row.id).eq('status', row.status).select('id');
    if (result.error) return { ok: false, error: '상태 변경에 실패했습니다. 마이그레이션 적용 여부를 확인해 주세요.' };
    if (!result.data?.length) return { ok: false, error: '다른 곳에서 먼저 변경됨 — 새로고침 후 확인해 주세요.' };
    changed = true;
    revalidatePath('/admin/users');
    revalidatePath('/admin/users/[userId]', 'page');
    revalidatePath('/admin/enrollments');
    revalidatePath('/dashboard');
    const history = await supabase.from('enrollment_status_events').insert({ enrollment_id: row.id, from_status: row.status, to_status: to, reason, actor_id: actor.id } as never);
    if (history.error) return { ok: false, error: '상태는 변경되었으나 이력 기록 실패 — 변경된 상태를 확인해 주세요.' };
    return { ok: true };
  } catch {
    return { ok: false, error: changed ? '상태는 변경되었으나 이력 기록 실패 — 변경된 상태를 확인해 주세요.' : '상태 변경 요청을 처리하지 못했습니다.' };
  }
}

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
