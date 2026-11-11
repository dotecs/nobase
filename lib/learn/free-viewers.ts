import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { FREE_LESSON_IDS } from '@/lib/learn/lessons/free-access';

export type FreeViewer = { user_id: string; name: string | null; phone: string | null; lead_source: string | null; joined: string | null; opened: number; completed: number; lastLesson: string; lastAt: string };
type Ev = { user_id: string; lesson_id: string; type: string; created_at: string };

/** 무료 강의를 연 로그인 사용자 중 뿌리깊은수학 수강생·관리자를 뺀 목록(최근 활동순). 코치 후속 상담용. */
export async function freeViewers(): Promise<FreeViewer[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 이 조회들은 생성된 타입에 없는 조인 필터를 쓴다
  const db = createAdminSupabaseClient() as any;
  const events: Ev[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await db.from('learn_lesson_events').select('user_id,lesson_id,type,created_at').in('type', ['open', 'complete']).in('lesson_id', [...FREE_LESSON_IDS]).order('created_at').range(from, from + 999);
    if (page.error) throw page.error;
    events.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < 1000) break;
  }
  const ids = [...new Set(events.map(e => e.user_id))];
  if (!ids.length) return [];
  const [profiles, enrolled] = await Promise.all([
    db.from('profiles').select('user_id,name,phone,lead_source,role,created_at').in('user_id', ids),
    db.from('enrollments').select('user_id, cohort:cohorts!inner(course:courses!inner(slug))').in('user_id', ids).eq('status', 'active').eq('cohort.course.slug', 'root-math'),
  ]);
  if (profiles.error) throw profiles.error;
  if (enrolled.error) throw enrolled.error;
  const skip = new Set<string>([...(enrolled.data ?? []).map((r: { user_id: string }) => r.user_id), ...(profiles.data ?? []).filter((p: { role: string }) => p.role === 'admin').map((p: { user_id: string }) => p.user_id)]);
  const byId = new Map((profiles.data ?? []).map((p: { user_id: string }) => [p.user_id, p]));
  return ids.filter(id => !skip.has(id)).map(id => {
    const mine = events.filter(e => e.user_id === id), last = mine[mine.length - 1], p = byId.get(id) as { name: string | null; phone: string | null; lead_source: string | null; created_at: string } | undefined;
    return { user_id: id, name: p?.name ?? null, phone: p?.phone ?? null, lead_source: p?.lead_source ?? null, joined: p?.created_at ?? null,
      opened: new Set(mine.filter(e => e.type === 'open').map(e => e.lesson_id)).size, completed: new Set(mine.filter(e => e.type === 'complete').map(e => e.lesson_id)).size,
      lastLesson: last.lesson_id, lastAt: last.created_at };
  }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}
