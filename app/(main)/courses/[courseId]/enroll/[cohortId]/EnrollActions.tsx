'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components'
import { FaCheckCircle, FaClock } from 'react-icons/fa'
import { PaymentModal } from './PaymentModal'
import styles from './enroll.module.css'

interface EnrollActionsProps {
  cohortId: string
  courseId: string
  userId: string
  price: number
  courseName: string
  cohortName: string
  isFull: boolean
  existingEnrollment: { id: string; status: string } | null
}

export default function EnrollActions({
  cohortId,
  courseId,
  userId,
  price,
  courseName,
  cohortName,
  isFull,
  existingEnrollment
}: EnrollActionsProps) {
  const router = useRouter()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const isFree = price === 0
  const isPaused = existingEnrollment?.status === 'paused'
  const isActive = existingEnrollment?.status === 'active'

  // 기존 신청 취소하고 다시 신청
  const handleCancelAndRestart = async () => {
    if (!confirm('기존 수강신청을 취소하고 다시 신청하시겠습니까?')) {
      return
    }

    setCancelling(true)

    try {
      const supabase = createClientSupabaseClient()

      // 기존 enrollment 삭제
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', existingEnrollment?.id)

      if (error) {
        console.error('Delete error:', error)
        alert('취소 중 오류가 발생했습니다.')
        return
      }

      // 페이지 새로고침하여 상태 초기화
      router.refresh()
    } catch (err) {
      console.error('Error:', err)
      alert('취소 중 오류가 발생했습니다.')
    } finally {
      setCancelling(false)
    }
  }

  // 무료 강좌 수강 신청
  const handleFreeEnroll = async () => {
    setLoading(true)
    
    try {
      const supabase = createClientSupabaseClient()
      
      // 중복 확인
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', userId)
        .eq('cohort_id', cohortId)
        .single()

      if (existing) {
        router.push(`/courses/${courseId}/cohorts/${cohortId}`)
        return
      }

      // 정원 확인
      const { data: cohortInfo } = await supabase
        .from('cohorts')
        .select('max_students')
        .eq('id', cohortId)
        .single()

      const maxStudents = (cohortInfo as any)?.max_students

      if (maxStudents) {
        const { count } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('cohort_id', cohortId)
          .in('status', ['active', 'paused'])

        if (count && count >= maxStudents) {
          alert('정원이 마감되었습니다.')
          router.refresh()
          return
        }
      }

      // 무료 강좌는 바로 active로 등록
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: userId,
          cohort_id: cohortId,
          status: 'active'
        } as any)

      if (error) {
        console.error('Enrollment error:', error)
        alert('수강 신청 중 오류가 발생했습니다.')
        return
      }

      router.push(`/courses/${courseId}/cohorts/${cohortId}`)
    } catch (err) {
      console.error('Error:', err)
      alert('수강 신청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 이미 등록된 경우 (active)
  if (isActive) {
    return (
      <div className={styles.enrollActions}>
        <div className={styles.enrolledBadge}>
          <FaCheckCircle />
          수강 중
        </div>
        <Link href={`/courses/${courseId}/cohorts/${cohortId}`} className={styles.fullWidth}>
          <Button variant="primary" size="lg" fullWidth>
            강좌 바로가기
          </Button>
        </Link>
      </div>
    )
  }

  // 입금 대기 중인 경우 (paused)
  if (isPaused) {
    return (
      <div className={styles.enrollActions}>
        <div className={styles.pendingBadge}>
          <FaClock />
          입금 확인 대기 중
        </div>
        <p className={styles.pendingMessage}>
          입금은 1시간 이내에 확인할 예정입니다.
          <br />
          (심야시간에는 확인이 늦어질 수 있습니다)
        </p>
        <button
          className={styles.restartButton}
          onClick={handleCancelAndRestart}
          disabled={cancelling}
        >
          {cancelling ? '취소 중...' : '처음부터 다시 수강신청하기'}
        </button>
      </div>
    )
  }

  // 정원 마감
  if (isFull) {
    return (
      <div className={styles.enrollActions}>
        <Button variant="secondary" size="lg" fullWidth disabled>
          정원이 마감되었습니다
        </Button>
      </div>
    )
  }

  // 무료 강좌
  if (isFree) {
    return (
      <div className={styles.enrollActions}>
        <Button 
          variant="primary" 
          size="lg" 
          fullWidth 
          onClick={handleFreeEnroll}
          loading={loading}
        >
          무료로 수강 신청하기
        </Button>
      </div>
    )
  }

  // 유료 강좌
  return (
    <div className={styles.enrollActions}>
      <Button 
        variant="primary" 
        size="lg" 
        fullWidth
        onClick={() => setShowPaymentModal(true)}
      >
        ₩{price.toLocaleString()} 수강 신청하기
      </Button>
      
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        cohortId={cohortId}
        courseId={courseId}
        userId={userId}
        price={price}
        courseName={courseName}
        cohortName={cohortName}
      />
    </div>
  )
}
