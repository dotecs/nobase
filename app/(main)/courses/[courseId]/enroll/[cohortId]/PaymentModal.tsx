'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { FaTimes, FaUniversity, FaQrcode, FaCheckCircle, FaReceipt } from 'react-icons/fa'
import styles from './enroll.module.css'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  cohortId: string
  courseId: string
  userId: string
  price: number
  courseName: string
  cohortName: string
}

type PaymentMethod = 'bank' | 'kakaopay'
type Step = 'method' | 'receipt' | 'complete'

export function PaymentModal({
  isOpen,
  onClose,
  cohortId,
  courseId,
  userId,
  price,
  courseName,
  cohortName
}: PaymentModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('method')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [depositorName, setDepositorName] = useState('')
  const [receiptContact, setReceiptContact] = useState('')
  const [needReceipt, setNeedReceipt] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method)
    setStep('receipt')
  }

  const handleSubmit = async () => {
    if (!depositorName.trim()) {
      setError('입금자명을 입력해주세요.')
      return
    }

    if (needReceipt && !receiptContact.trim()) {
      setError('현금영수증 발급을 위한 연락처를 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')

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
        setError('이미 신청된 강좌입니다.')
        setLoading(false)
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
          setError('정원이 마감되었습니다.')
          setLoading(false)
          return
        }
      }

      // 수강 등록 (paused 상태로)
      const { error: insertError } = await supabase
        .from('enrollments')
        .insert({
          user_id: userId,
          cohort_id: cohortId,
          status: 'paused',
          depositor_name: depositorName.trim(),
          receipt_contact: needReceipt ? receiptContact.trim() : null
        } as any)

      if (insertError) {
        console.error('Enrollment error:', insertError)
        setError('수강 신청 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      setStep('complete')
    } catch (err) {
      console.error('Error:', err)
      setError('수강 신청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (step === 'complete') {
      router.refresh()
    }
    onClose()
    // Reset state
    setStep('method')
    setPaymentMethod(null)
    setDepositorName('')
    setReceiptContact('')
    setNeedReceipt(true)
    setError('')
  }

  return (
    <div className={styles.paymentOverlay} onClick={handleClose}>
      <div className={styles.paymentModal} onClick={e => e.stopPropagation()}>
        <div className={styles.paymentHeader}>
          <h3 className={styles.paymentTitle}>
            {step === 'method' && '결제 방법 선택'}
            {step === 'receipt' && '현금영수증 정보'}
            {step === 'complete' && '신청 완료'}
          </h3>
          <button className={styles.paymentClose} onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.paymentContent}>
          {/* Step 1: 결제 방법 선택 */}
          {step === 'method' && (
            <>
              <div className={styles.paymentSummary}>
                <p className={styles.paymentCourseName}>{courseName}</p>
                <p className={styles.paymentCohortName}>{cohortName}</p>
                <p className={styles.paymentPrice}>₩{price.toLocaleString()}</p>
              </div>

              <div className={styles.paymentMethods}>
                <button
                  className={styles.paymentMethodButton}
                  onClick={() => handleMethodSelect('bank')}
                >
                  <FaUniversity className={styles.paymentMethodIcon} />
                  <div className={styles.paymentMethodInfo}>
                    <span className={styles.paymentMethodName}>계좌이체</span>
                    <span className={styles.paymentMethodDesc}>
                      계좌 정보를 확인 후 송금해주세요
                    </span>
                  </div>
                </button>

                <button
                  className={styles.paymentMethodButton}
                  onClick={() => handleMethodSelect('kakaopay')}
                >
                  <FaQrcode className={styles.paymentMethodIcon} />
                  <div className={styles.paymentMethodInfo}>
                    <span className={styles.paymentMethodName}>카카오페이 송금</span>
                    <span className={styles.paymentMethodDesc}>
                      QR코드로 간편하게 송금하세요
                    </span>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Step 2: 현금영수증 정보 */}
          {step === 'receipt' && (
            <>
              <div className={styles.receiptSection}>
                {paymentMethod === 'bank' && (
                  <div className={styles.bankInfo}>
                    <h4>입금 계좌 정보</h4>
                    <p className={styles.bankAccount}>
                      <strong>농협은행 301-0281-8754-81</strong>
                      <br />
                      예금주: 한철민(도텍)
                    </p>
                    <p className={styles.bankAmount}>
                      입금액: <strong>₩{price.toLocaleString()}</strong>
                    </p>
                  </div>
                )}

                {paymentMethod === 'kakaopay' && (
                  <div className={styles.qrSection}>
                    <h4>카카오페이 송금 QR</h4>
                    <div className={styles.qrImageWrapper}>
                      <Image
                        src="/kakaopay-qr.jpg"
                        alt="카카오페이 송금 QR 코드"
                        width={200}
                        height={246}
                        className={styles.qrImage}
                        onError={(e) => {
                          // 이미지 로드 실패 시 플레이스홀더 표시
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.innerHTML = `
                              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:180px;height:180px;background:var(--color-bg-secondary);border-radius:var(--radius-lg);color:var(--color-text-muted);">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13 0h-2v2h2v-2zm0 4h-2v2h2v-2zm-4-4h-2v2h2v-2zm4 0h2v2h-2v-2zm2 4h-2v2h2v-2zm-4 0h-2v2h2v-2z"/></svg>
                                <p style="margin-top:8px;font-size:12px;">QR 이미지 준비 중</p>
                              </div>
                            `
                          }
                        }}
                      />
                    </div>
                    <p className={styles.qrHint}>QR코드를 스캔하여 송금해주세요</p>
                    <p className={styles.bankAmount}>
                      송금액: <strong>₩{price.toLocaleString()}</strong>
                    </p>
                  </div>
                )}

                <div className={styles.receiptForm}>
                  <div className={styles.receiptInput}>
                    <label htmlFor="depositorName">
                      입금자명 <span className={styles.required}>*</span>
                    </label>
                    <input
                      id="depositorName"
                      type="text"
                      value={depositorName}
                      onChange={(e) => setDepositorName(e.target.value)}
                      placeholder="홍길동"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.receiptCheckbox}>
                    <label>
                      <input
                        type="checkbox"
                        checked={needReceipt}
                        onChange={(e) => setNeedReceipt(e.target.checked)}
                      />
                      <span>현금영수증 발급 신청</span>
                    </label>
                  </div>

                  {needReceipt && (
                    <div className={styles.receiptInput}>
                      <label htmlFor="receiptContact">
                        <FaReceipt />
                        연락처 (휴대폰번호 또는 사업자등록번호)
                      </label>
                      <input
                        id="receiptContact"
                        type="text"
                        value={receiptContact}
                        onChange={(e) => setReceiptContact(e.target.value)}
                        placeholder="010-0000-0000"
                        className={styles.input}
                      />
                    </div>
                  )}
                </div>

                {error && <p className={styles.errorMessage}>{error}</p>}

                <div className={styles.receiptActions}>
                  <button
                    className={styles.backButton}
                    onClick={() => setStep('method')}
                    disabled={loading}
                  >
                    이전
                  </button>
                  <button
                    className={styles.submitButton}
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? '처리 중...' : '수강 신청 완료'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: 완료 */}
          {step === 'complete' && (
            <div className={styles.completeSection}>
              <div className={styles.completeIcon}>
                <FaCheckCircle />
              </div>
              <h4 className={styles.completeTitle}>수강 신청이 완료되었습니다!</h4>
              <div className={styles.completeMessage}>
                <p>
                  입금 확인 후 <strong>관리자가 승인</strong>하면
                  <br />
                  대시보드에서 강좌를 수강하실 수 있습니다.
                </p>
                <p className={styles.completeNote}>
                  입금은 1시간 이내에 확인할 예정입니다.
                  <br />
                  (심야시간에는 확인이 늦어질 수 있습니다)
                </p>
              </div>
              <button className={styles.doneButton} onClick={handleClose}>
                확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface EnrollButtonProps {
  cohortId: string
  courseId: string
  userId: string
  price: number
  courseName: string
  cohortName: string
  isFree: boolean
  isFull: boolean
  onFreeEnroll: () => void
}

export function EnrollButton({
  cohortId,
  courseId,
  userId,
  price,
  courseName,
  cohortName,
  isFree,
  isFull,
  onFreeEnroll
}: EnrollButtonProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  if (isFull) {
    return (
      <button className={styles.enrollButtonDisabled} disabled>
        정원이 마감되었습니다
      </button>
    )
  }

  if (isFree) {
    return (
      <form action={onFreeEnroll} className={styles.fullWidth}>
        <button type="submit" className={styles.enrollButtonPrimary}>
          무료로 수강 신청하기
        </button>
      </form>
    )
  }

  return (
    <>
      <button
        className={styles.enrollButtonPrimary}
        onClick={() => setShowPaymentModal(true)}
      >
        ₩{price.toLocaleString()} 수강 신청하기
      </button>
      
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
    </>
  )
}
