import Link from 'next/link'
import { FaTimesCircle } from 'react-icons/fa'
import styles from '../payments.module.css'

interface FailPageProps {
  searchParams: Promise<{
    code?: string
    message?: string
  }>
}

export default async function PaymentFailPage({ searchParams }: FailPageProps) {
  const { code, message } = await searchParams

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconError}>
          <FaTimesCircle />
        </div>
        <h1 className={styles.title}>결제가 취소되었습니다</h1>
        <p className={styles.description}>
          {message || '결제 진행 중 문제가 발생했습니다.'}
          {code && <span className={styles.errorCode}> (코드: {code})</span>}
        </p>
        <Link href="/courses" className={styles.primaryButton}>
          수강신청으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
