import { NextRequest, NextResponse } from 'next/server'
import { getUser, createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { Cohort, Course } from '@/lib/database.types'

/**
 * 카드결제 주문 생성 (토스페이먼츠 결제 전 단계)
 * - 금액은 클라이언트가 아닌 서버(DB의 cohort.price)에서 확정한다
 * - payments 테이블에 ready 상태로 기록 후 orderId 반환
 */
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { cohortId } = await request.json()
  if (!cohortId || typeof cohortId !== 'string') {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // 기수/강좌 확인 (가격은 반드시 서버에서 조회)
  const { data: cohortData } = await supabase
    .from('cohorts')
    .select('*, courses(*)')
    .eq('id', cohortId)
    .eq('is_active', true)
    .single()

  const cohort = cohortData as (Cohort & { courses: Course }) | null
  if (!cohort || !cohort.courses) {
    return NextResponse.json({ error: '모집 중인 기수가 아닙니다.' }, { status: 404 })
  }
  if (!cohort.price || cohort.price <= 0) {
    return NextResponse.json({ error: '무료 강좌는 카드결제 대상이 아닙니다.' }, { status: 400 })
  }

  // 중복 수강 확인
  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 신청된 강좌입니다.' }, { status: 409 })
  }

  // 정원 확인
  if (cohort.max_students) {
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('cohort_id', cohortId)
      .in('status', ['active', 'paused'])

    if (count && count >= cohort.max_students) {
      return NextResponse.json({ error: '정원이 마감되었습니다.' }, { status: 409 })
    }
  }

  const orderId = `ord_${crypto.randomUUID().replace(/-/g, '')}`
  const orderName = `${cohort.courses.title} · ${cohort.title}`.slice(0, 100)

  const admin = createAdminSupabaseClient()
  const { error: insertError } = await admin.from('payments').insert({
    order_id: orderId,
    user_id: user.id,
    cohort_id: cohortId,
    amount: cohort.price,
    status: 'ready',
  } as never)

  if (insertError) {
    console.error('payment insert error:', insertError)
    return NextResponse.json({ error: '주문 생성에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({
    orderId,
    orderName,
    amount: cohort.price,
  })
}
