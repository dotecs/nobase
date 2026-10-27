'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { cohortEndFilter, buildCohortEndEvents } from '@/lib/enrollment-status';

export async function endCohortEnrollments(input: { cohortId: string; reason: string }): Promise<{ ok: boolean; message: string }> {
  const parsed = z.object({ cohortId: z.uuid(), reason: z.string().trim().min(2).max(200) }).strict().safeParse(input);
  if (!parsed.success) return { ok: false, message: '기수 정보를 확인하고 사유를 2~200자로 입력해 주세요.' };
  let changed = 0;
  try {
    const client = await createServerSupabaseClient();
    const { data: { user: actor }, error: authError } = await client.auth.getUser();
    if (authError || !actor) return { ok: false, message: '로그인이 필요합니다.' };
    const profile = await client.from('profiles').select('role').eq('user_id', actor.id).single();
    if (profile.error || (profile.data as { role: string } | null)?.role !== 'admin') return { ok: false, message: '관리자만 일괄 종료할 수 있습니다.' };
    const cohort = await client.from('cohorts').select('id').eq('id', parsed.data.cohortId).maybeSingle();
    if (cohort.error || !cohort.data) return { ok: false, message: '기수를 찾을 수 없습니다.' };
    const filter = cohortEndFilter(parsed.data.cohortId);
    const result = await client.from('enrollments').update({ status: 'ended' } as never).eq('cohort_id', filter.cohort_id).eq('status', filter.status).select('id,user_id');
    if (result.error) return { ok: false, message: '수강 일괄 종료에 실패했습니다.' };
    const rows = (result.data ?? []) as { id: string; user_id: string }[];
    changed = rows.length;
    revalidatePath(`/admin/cohorts/${parsed.data.cohortId}`);
    revalidatePath('/admin/users');
    revalidatePath('/admin/users/[userId]', 'page');
    revalidatePath('/admin/enrollments');
    revalidatePath('/admin');
    revalidatePath('/dashboard');
    if (!changed) return { ok: true, message: '0명 종료, 이력 0건 — 수강 중인 대상이 없습니다.' };
    const events = await client.from('enrollment_status_events').insert(buildCohortEndEvents(rows, parsed.data.reason, actor.id) as never);
    if (events.error) return { ok: false, message: `${changed}명 종료, 이력 0건 — 이력 기록 실패. 종료 상태는 유지됩니다.` };
    return { ok: true, message: `${changed}명 종료, 이력 ${changed}건` };
  } catch {
    return { ok: false, message: changed ? `${changed}명 종료 — 이력 기록 실패 또는 응답 확인 실패. 종료 상태와 이력을 확인해 주세요.` : '일괄 종료 요청을 처리하지 못했습니다. 상태를 확인해 주세요.' };
  }
}
