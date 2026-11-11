import { createAdminSupabaseClient } from '@/lib/supabase-admin';

/** 러닝 스튜디오 강의와 같은 내용의 원본 자료: 뇌지컬 트레이닝 과정의 '뿌리 깊은 수학' 과목(무료 공개 영상 + 통합본 교재 PDF). */
export const ORIGINAL_SUBJECT_TITLE = '뿌리 깊은 수학';
type Resource = { type?: string; title?: string; storage_path?: string };
export type OriginalMaterials = { videos: Record<string, string>; textbook: { title: string; storage_path: string } | null };

/** 강의 제목 → 원본 영상 무료 페이지 경로, 그리고 교재 PDF 위치. 실패하면 빈 값(안내 페이지는 그대로 뜬다). */
export async function originalMaterials(): Promise<OriginalMaterials> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 조인 결과 타입이 생성 타입에 없다
    const db = createAdminSupabaseClient() as any;
    const subject = await db.from('subjects').select('id,resources,course:courses!inner(id,slug,is_published)').eq('title', ORIGINAL_SUBJECT_TITLE).eq('is_published', true).maybeSingle();
    if (subject.error || !subject.data || !subject.data.course?.is_published) return { videos: {}, textbook: null };
    const lessons = await db.from('lessons').select('id,title').eq('subject_id', subject.data.id).eq('is_published', true).eq('is_free', true);
    if (lessons.error) return { videos: {}, textbook: null };
    const base = `/courses/${subject.data.course.slug ?? subject.data.course.id}/free/`;
    const videos = Object.fromEntries((lessons.data ?? []).map((l: { id: string; title: string }) => [l.title.trim(), base + l.id]));
    const pdf = ((subject.data.resources ?? []) as Resource[]).find(r => r.type === 'pdf' && r.storage_path);
    return { videos, textbook: pdf ? { title: pdf.title || '뿌리깊은수학 교재.pdf', storage_path: pdf.storage_path! } : null };
  } catch { return { videos: {}, textbook: null }; }
}
