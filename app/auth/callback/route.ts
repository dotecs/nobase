import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const returnTo = requestUrl.searchParams.get('returnTo') || '/dashboard';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    // 프로필 완성 여부 확인
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', session.user.id)
        .single();

      // name 또는 phone이 없으면 프로필 완성 페이지로
      if (!profile?.name || !profile?.phone) {
        return NextResponse.redirect(new URL('/complete-profile', requestUrl.origin));
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(returnTo, requestUrl.origin));
}
