import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getUser } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const lessonId = searchParams.get('lessonId');

  if (!path || !lessonId) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
  }

  // 사용자 인증 확인
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  // 레슨 접근 권한 확인 (레슨의 코스에 등록되어 있는지)
  const { data: lessonData } = await supabase
    .from('lessons')
    .select('course_id, is_free')
    .eq('id', lessonId)
    .single();

  const lesson = lessonData as { course_id: string; is_free: boolean } | null;

  if (!lesson) {
    return NextResponse.json({ error: '레슨을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 무료 레슨이 아닌 경우 등록 확인
  if (!lesson.is_free) {
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id, cohorts!inner(course_id)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('cohorts.course_id', lesson.course_id)
      .limit(1)
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json({ error: '수강 등록이 필요합니다.' }, { status: 403 });
    }
  }

  // Signed URL 생성 (1시간 유효)
  const { data, error } = await supabase.storage
    .from('lesson-resources')
    .createSignedUrl(path, 60 * 60);

  if (error || !data) {
    console.error('Signed URL 생성 실패:', error);
    return NextResponse.json({ error: '다운로드 URL 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
