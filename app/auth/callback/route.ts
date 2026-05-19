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
      // Kakao identity의 provider_id 추출 (있으면 카카오 ID 기반 매칭 우선)
      const kakaoIdentity = session.user.identities?.find((i) => i.provider === 'kakao');
      // Supabase SDK 버전에 따라 위치가 다를 수 있어 여러 경로 fallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ki = kakaoIdentity as any;
      const kakaoIdRaw =
        ki?.provider_id ||
        ki?.identity_data?.provider_id ||
        ki?.identity_data?.sub ||
        null;
      let kakaoId: number | null = null;
      if (kakaoIdRaw) {
        const parsed = Number(kakaoIdRaw);
        if (Number.isFinite(parsed) && parsed > 0) {
          kakaoId = parsed;
        }
      }

      // 카카오 ID 우선, 실패 시 이메일로 fallback (서버 함수가 내부적으로 처리)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: linkResult, error: linkError } = await (supabase as any)
        .rpc('link_migrated_data', {
          p_user_id: session.user.id,
          p_email: session.user.email,
          p_kakao_id: kakaoId,
        });

      if (linkError) {
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

      // 마이그레이션 자동 매칭 성공이면 환영 토스트용 쿼리 파라미터 부착
      const migrated = linkResult?.linked === true;
      const migratedEnrollments = Number(linkResult?.enrollments || 0);
      const migratedProgress = Number(linkResult?.lesson_progress || 0);
      const cohortTitles: string[] = Array.isArray(linkResult?.cohort_titles)
        ? (linkResult.cohort_titles as string[]).filter(Boolean)
        : [];

      const attachMigratedParams = (url: URL) => {
        url.searchParams.set('migrated', '1');
        if (migratedEnrollments > 0) url.searchParams.set('e', String(migratedEnrollments));
        if (migratedProgress > 0) url.searchParams.set('p', String(migratedProgress));
        if (cohortTitles.length > 0) url.searchParams.set('c', cohortTitles.join('|'));
      };

      // name 또는 phone이 없으면 프로필 완성 페이지로 (이때도 migrated 정보 전달)
      if (!profile?.name || !profile?.phone) {
        const url = new URL('/complete-profile', requestUrl.origin);
        if (migrated) attachMigratedParams(url);
        return NextResponse.redirect(url);
      }

      // 정상 returnTo로 이동하되, 마이그레이션 매칭 성공이면 토스트용 쿼리 파라미터 부착
      const finalUrl = new URL(returnTo, requestUrl.origin);
      if (migrated) attachMigratedParams(finalUrl);
      return NextResponse.redirect(finalUrl);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(returnTo, requestUrl.origin));
}
