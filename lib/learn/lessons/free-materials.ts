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

/** 같은 제목의 원본 강의 영상(대표 영상) URL. 없거나 실패하면 null. */
export async function originalVideoUrl(title: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 조인 결과 타입이 생성 타입에 없다
    const db = createAdminSupabaseClient() as any;
    const lesson = await db.from('lessons').select('id, subject:subjects!inner(title,is_published)').eq('title', title.trim()).eq('is_published', true).eq('subject.title', ORIGINAL_SUBJECT_TITLE).eq('subject.is_published', true).limit(1).maybeSingle();
    if (lesson.error || !lesson.data) return null;
    const video = await db.from('lesson_videos').select('video_url').eq('lesson_id', lesson.data.id).eq('is_main', true).order('sort_order').limit(1).maybeSingle();
    return video.error ? null : (video.data?.video_url as string | undefined) ?? null;
  } catch { return null; }
}
