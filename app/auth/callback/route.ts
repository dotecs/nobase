import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo') || '/dashboard';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    // 로그인 성공 시 마이그레이션 데이터 연결 시도
    if (session?.user) {
      // 이메일 기반으로 마이그레이션된 데이터 연결
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: linkResult, error: linkError } = await (supabase as any)
        .rpc('link_migrated_data', {
          p_user_id: session.user.id,
          p_email: session.user.email
        });

      if (linkError) {
        // 함수가 없거나 마이그레이션 테이블이 없는 경우 무시
        if (!linkError.message?.includes('does not exist')) {
          console.error('마이그레이션 데이터 연결 실패:', linkError);
        }
      } else if (linkResult?.linked) {
        console.log('마이그레이션 데이터 연결 완료:', linkResult);
      }

      // 프로필 완성 여부 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', session.user.id)
        .single() as { data: { name: string | null; phone: string | null } | null };

      // name 또는 phone이 없으면 프로필 완성 페이지로
      if (!profile?.name || !profile?.phone) {
        return NextResponse.redirect(new URL('/complete-profile', requestUrl.origin));
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(returnTo, requestUrl.origin));
}
