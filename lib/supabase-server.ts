import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from './database.types'

// 쿠키 값을 안전하게 파싱하는 헬퍼 함수
function safeParseCookieValue(value: string | undefined): string | undefined {
  if (!value) return value
  
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

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = cookieStore.get(name)?.value
          return safeParseCookieValue(value)
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component에서는 쿠키 설정 불가 - 무시
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Server Component에서는 쿠키 삭제 불가 - 무시
          }
        },
      },
    }
  )
}

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

export async function getUser() {
  const supabase = await createServerSupabaseClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const user = await getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return profile
}
