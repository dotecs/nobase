import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import styles from '../payments.module.css'

interface SuccessPageProps {
  searchParams: Promise<{
    paymentKey?: string
    orderId?: string
    amount?: string
  }>
}

interface PaymentRow {
  id: string
  order_id: string
  user_id: string
  cohort_id: string
  amount: number
  status: string
}

export default async function PaymentSuccessPage({ searchParams }: SuccessPageProps) {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }

  const { paymentKey, orderId, amount } = await searchParams

  let errorMessage: string | null = null
  let paid = false

  if (!paymentKey || !orderId || !amount) {
    errorMessage = '결제 정보가 올바르지 않습니다.'
  } else {
    const admin = createAdminSupabaseClient()

    // 주문 조회 및 금액 검증 (위·변조 방지)
    const { data: paymentData } = await admin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single()

    const payment = paymentData as PaymentRow | null

    if (!payment || payment.user_id !== user.id) {
      errorMessage = '주문 정보를 찾을 수 없습니다.'
    } else if (payment.status === 'paid') {
      paid = true // 새로고침 등 중복 접근 — 이미 처리 완료
    } else if (payment.amount !== Number(amount)) {
      errorMessage = '결제 금액이 주문 금액과 일치하지 않습니다.'
    } else {
      // 토스페이먼츠 결제 승인
      const secretKey = process.env.TOSS_SECRET_KEY || ''
      const basicToken = Buffer.from(`${secretKey}:`).toString('base64')

      const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
      })

      const confirmData = await confirmRes.json()

      if (!confirmRes.ok) {
        errorMessage = confirmData?.message || '결제 승인에 실패했습니다.'
        await admin
          .from('payments')
          .update({ status: 'failed', fail_reason: errorMessage } as never)
          .eq('id', payment.id)
      } else {
        // 결제 기록 갱신 + 수강 등록 자동 승인
        await admin
          .from('payments')
          .update({
            status: 'paid',
            payment_key: paymentKey,
            method: confirmData?.method ?? 'CARD',
            receipt_url: confirmData?.receipt?.url ?? null,
            approved_at: confirmData?.approvedAt ?? new Date().toISOString(),
          } as never)
          .eq('id', payment.id)

        const { error: enrollError } = await admin.from('enrollments').insert({
          user_id: payment.user_id,
          cohort_id: payment.cohort_id,
          status: 'active',
          depositor_name: '카드결제(토스페이먼츠)',
        } as never)

        if (enrollError && !enrollError.message?.includes('duplicate')) {
          console.error('enrollment insert error:', enrollError)
        }
        paid = true
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {paid ? (
          <>
            <div className={styles.iconSuccess}>
              <FaCheckCircle />
            </div>
            <h1 className={styles.title}>결제가 완료되었습니다!</h1>
            <p className={styles.description}>
              수강 등록이 자동으로 승인되었습니다.
              <br />
              지금 바로 학습을 시작할 수 있습니다.
            </p>
            <Link href="/dashboard" className={styles.primaryButton}>
              내 강의실 가기
            </Link>
          </>
        ) : (
          <>
            <div className={styles.iconError}>
              <FaTimesCircle />
            </div>
            <h1 className={styles.title}>결제를 완료하지 못했습니다</h1>
            <p className={styles.description}>{errorMessage}</p>
            <Link href="/courses" className={styles.primaryButton}>
              수강신청으로 돌아가기
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
