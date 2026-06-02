import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

/**
 * Service Role 권한으로 동작하는 admin 클라이언트.
 * RLS 우회가 필요한 서버 사이드 작업(마이그레이션 데이터 연결, 관리자 RPC 등)에만 사용.
 *
 * 절대 클라이언트 측 코드에서 import하지 말 것 — SERVICE_ROLE_KEY가 노출됨.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다.')
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.')
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
