import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUser } from '@/lib/supabase-server';

// 자동 완료 임계치 (영상의 90% 도달 시 자동으로 completed=true)
const AUTO_COMPLETE_THRESHOLD = 0.9;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await context.params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  let body: { position?: number; duration?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const position = Math.max(0, Math.floor(Number(body.position) || 0));
  const duration = Math.max(0, Math.floor(Number(body.duration) || 0));
  if (!Number.isFinite(position) || !Number.isFinite(duration)) {
    return NextResponse.json({ error: '잘못된 숫자 값입니다.' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // 레슨 존재 & 접근 권한 확인 (무료가 아니면 등록 필요)
  const { data: lessonRow } = await supabase
    .from('lessons')
    .select('id, course_id, is_free')
    .eq('id', lessonId)
    .single();
  const lesson = lessonRow as { id: string; course_id: string; is_free: boolean } | null;
  if (!lesson) {
    return NextResponse.json({ error: '레슨을 찾을 수 없습니다.' }, { status: 404 });
  }
  if (!lesson.is_free) {
    const { data: enr } = await supabase
      .from('enrollments')
      .select('id, cohorts!inner(course_id)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('cohorts.course_id', lesson.course_id)
      .limit(1)
      .maybeSingle();
    if (!enr) {
      return NextResponse.json({ error: '수강 등록이 필요합니다.' }, { status: 403 });
    }
  }

  // 기존 진도 로드
  const { data: existing } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lessonId)
    .maybeSingle();

  const existingMax = (existing as any)?.max_position_seconds ?? 0;
  const wasCompleted = (existing as any)?.completed ?? false;

  const newMax = Math.max(existingMax, position);
  const reachedAutoThreshold =
    !wasCompleted &&
    duration > 0 &&
    newMax >= duration * AUTO_COMPLETE_THRESHOLD;

  const nowIso = new Date().toISOString();
  const upsertPayload: Record<string, any> = {
    user_id: user.id,
    lesson_id: lessonId,
    last_position_seconds: position,
    max_position_seconds: newMax,
    updated_at: nowIso,
  };

  if (reachedAutoThreshold) {
    upsertPayload.completed = true;
    upsertPayload.completed_at = nowIso;
    upsertPayload.auto_completed = true;
  }

  const { error: upsertError } = await (supabase
    .from('lesson_progress') as any)
    .upsert(upsertPayload, { onConflict: 'user_id,lesson_id' });

  if (upsertError) {
    console.error('lesson_progress upsert 실패:', upsertError);
    return NextResponse.json(
      { error: '진도 저장 실패', detail: upsertError.message },
      { status: 500 }
    );
  }

  // lesson_videos.duration_seconds 백필 (비어있을 때만, fire-and-forget)
  if (duration > 0) {
    (supabase as any)
      .rpc('backfill_lesson_video_duration', {
        p_lesson_id: lessonId,
        p_duration: duration,
      })
      .then(({ error }: { error: any }) => {
        if (error) {
          console.error('backfill_lesson_video_duration 실패:', error);
        }
      });
  }

  return NextResponse.json({
    ok: true,
    last_position_seconds: position,
    max_position_seconds: newMax,
    auto_completed: reachedAutoThreshold || (existing as any)?.auto_completed || false,
    completed: reachedAutoThreshold || wasCompleted,
  });
}
