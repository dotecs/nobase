import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 쿠키 값을 안전하게 파싱하는 헬퍼 함수
function safeParseCookieValue(value: string | undefined): string | undefined {
  if (!value) return value
  
  // 이미 올바른 형식이면 그대로 반환
  try {
    // base64로 인코딩된 JSON인지 확인
    if (value.startsWith('base64-')) {
      return value
    }
    
    // JSON 문자열이 이중으로 인코딩되었는지 확인
    if (value.startsWith('"') && value.endsWith('"')) {
      return JSON.parse(value)
    }
    
    return value
  } catch {
    return value
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = request.cookies.get(name)?.value
          return safeParseCookieValue(value)
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 세션 갱신
  const { data: { user } } = await supabase.auth.getUser()

  // 루트 경로에서 code 파라미터가 있으면 /auth/callback으로 리다이렉트
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const code = request.nextUrl.searchParams.get('code')
    const callbackUrl = new URL('/auth/callback', request.url)
    callbackUrl.searchParams.set('code', code!)
    return NextResponse.redirect(callbackUrl)
  }

  // 보호된 경로 체크
  const protectedPaths = ['/dashboard', '/courses', '/lessons', '/announcements', '/start/confirm', '/start/done']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('returnTo', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  // 이미 로그인한 사용자가 로그인 페이지 접근 시
  const authPaths = ['/login']
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isAuthPath && user) {
    const returnTo = request.nextUrl.searchParams.get('returnTo')
    if (returnTo) {
      return NextResponse.redirect(new URL(returnTo, request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
