'use server';

import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { getInterviewWorkbookAccess } from '@/lib/interview-workbook';
import { CONTENT_VERSION, getAllFields, noteKey } from '@/lib/interview-workbook-content';

export type WorkbookAnswers = Record<string, string | boolean>;

export type SaveResult =
  | { ok: true; savedAt: string }
  | { ok: false; error: string };

/** 허용된 키(질문 id, 체크리스트 메모 키)만 통과시키고 값 타입/길이를 정리 */
function sanitize(input: unknown): WorkbookAnswers {
  const allowed = new Map<string, { kind: string; maxLength?: number }>();
  for (const f of getAllFields()) {
    allowed.set(f.id, { kind: f.kind, maxLength: f.maxLength });
    if (f.kind === 'checkbox') allowed.set(noteKey(f.id), { kind: 'text' });
  }

  const out: WorkbookAnswers = {};
  if (!input || typeof input !== 'object') return out;

  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const spec = allowed.get(key);
    if (!spec) continue;
    if (spec.kind === 'checkbox') {
      if (typeof raw === 'boolean') out[key] = raw;
      continue;
    }
    if (typeof raw !== 'string') continue;
    // 500자 문항은 서버에서도 제한, 그 외는 과도한 입력만 방지
    const limit = spec.maxLength ?? 5000;
    out[key] = raw.length > limit ? raw.slice(0, limit) : raw;
  }
  return out;
}

export async function saveInterviewWorkbookAnswers(answers: WorkbookAnswers): Promise<SaveResult> {
  const user = await getUser();
  if (!user) return { ok: false, error: '로그인이 필요합니다.' };

  const profile = (await getProfile()) as { role?: string } | null;
  const access = await getInterviewWorkbookAccess(user.id, profile?.role);
  if (!access.granted) return { ok: false, error: '이 워크북에 대한 접근 권한이 없습니다.' };

  const clean = sanitize(answers);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createServerSupabaseClient()) as any;

  const { data, error } = await supabase
    .from('interview_workbook_answers')
    .upsert(
      { user_id: user.id, answers: clean, version: CONTENT_VERSION },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single();

  if (error) {
    console.error('saveInterviewWorkbookAnswers:', error);
    return { ok: false, error: '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }

  return { ok: true, savedAt: data?.updated_at ?? new Date().toISOString() };
}
