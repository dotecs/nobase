import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header/Header'
import Footer from '@/components/Footer'
import { Button } from '@/components'
import { Course, Cohort, Profile } from '@/lib/database.types'
import { FaArrowLeft, FaBook, FaCalendarAlt, FaUsers, FaClock, FaCheckCircle } from 'react-icons/fa'
import styles from '../../courses.module.css'

interface PageProps {
  params: Promise<{
    courseId: string
    cohortId: string
  }>
}

export default async function EnrollPage({ params }: PageProps) {
  const { courseId, cohortId } = await params
  const supabase = await createServerSupabaseClient()

  // 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect(`/login?redirect=/courses/${courseId}/enroll/${cohortId}`)
  }

  // 프로필 조회
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const profile = profileData as Profile | null

  // 코스 정보 조회
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('is_published', true)
    .single()

  const course = courseData as Course | null

  if (courseError || !course) {
    redirect('/courses')
  }

  // 기수 정보 조회
  const { data: cohortData, error: cohortError } = await supabase
    .from('cohorts')
    .select('*')
    .eq('id', cohortId)
    .eq('course_id', courseId)
    .eq('is_active', true)
    .single()

  const cohort = cohortData as Cohort | null

  if (cohortError || !cohort) {
    redirect('/courses')
  }

  // 이미 등록되어 있는지 확인
  const { data: existingEnrollment } = await supabase
    .from('enrollments')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .single()

  // 해당 기수의 레슨 수 조회
  const { count: lessonCount } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('cohort_id', cohortId)
    .eq('is_published', true)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '미정'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 수강신청 처리 (Server Action)
  async function handleEnroll() {
    'use server'
    
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      redirect('/login')
    }

    // 중복 등록 방지
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('cohort_id', cohortId)
      .single()

    if (existing) {
      redirect(`/courses/${courseId}/cohorts/${cohortId}`)
    }

    // 수강 등록
    const enrollmentData = {
      user_id: user.id,
      cohort_id: cohortId,
      status: 'active' as const
    }
    
    const { error } = await supabase
      .from('enrollments')
      .insert(enrollmentData as any)

    if (error) {
      console.error('Enrollment error:', error)
      redirect(`/courses?error=enrollment_failed`)
    }

    redirect(`/courses/${courseId}/cohorts/${cohortId}`)
  }

  return (
    <div className={styles.enrollPage}>
      <Header isLoggedIn={true} userRole={profile?.role} />
      <main className={styles.enrollMain}>
        <Link href="/courses" className={styles.backLink}>
          <FaArrowLeft />
          <span>강좌 목록으로 돌아가기</span>
        </Link>

        <div className={styles.enrollCard}>
          {/* 썸네일 */}
          <div className={styles.enrollThumbnail}>
            {course.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt={course.title}
                fill
                className={styles.enrollThumbnailImage}
              />
            ) : (
              <div className={styles.enrollThumbnailPlaceholder}>
                <FaBook />
              </div>
            )}
          </div>

          <div className={styles.enrollContent}>
            {/* 기수 뱃지 */}
            <span className={styles.enrollCohortBadge}>
              <FaUsers />
              {cohort.title}
            </span>

            {/* 강좌 제목 */}
            <h1 className={styles.enrollTitle}>{course.title}</h1>

            {/* 강좌 설명 */}
            {course.description && (
              <p className={styles.enrollDescription}>{course.description}</p>
            )}

            {/* 강좌 정보 */}
            <div className={styles.enrollInfo}>
              <div className={styles.enrollInfoItem}>
                <span className={styles.enrollInfoLabel}>시작일</span>
                <span className={styles.enrollInfoValue}>
                  <FaCalendarAlt />
                  {formatDate(cohort.starts_at)}
                </span>
              </div>
              <div className={styles.enrollInfoItem}>
                <span className={styles.enrollInfoLabel}>종료일</span>
                <span className={styles.enrollInfoValue}>
                  <FaCalendarAlt />
                  {formatDate(cohort.ends_at)}
                </span>
              </div>
              <div className={styles.enrollInfoItem}>
                <span className={styles.enrollInfoLabel}>총 레슨</span>
                <span className={styles.enrollInfoValue}>
                  <FaBook />
                  {lessonCount ?? 0}개
                </span>
              </div>
              <div className={styles.enrollInfoItem}>
                <span className={styles.enrollInfoLabel}>진행 상태</span>
                <span className={styles.enrollInfoValue}>
                  <FaClock />
                  {cohort.is_active ? '진행중' : '마감'}
                </span>
              </div>
            </div>

            {/* 액션 영역 */}
            <div className={styles.enrollActions}>
              {existingEnrollment ? (
                <>
                  <div className={styles.alreadyEnrolledBadge}>
                    <FaCheckCircle />
                    이미 수강 신청된 강좌입니다
                  </div>
                  <Link href={`/courses/${courseId}/cohorts/${cohortId}`}>
                    <Button variant="primary" size="lg" fullWidth>
                      강좌 바로가기
                    </Button>
                  </Link>
                </>
              ) : (
                <form action={handleEnroll}>
                  <Button type="submit" variant="primary" size="lg" fullWidth>
                    수강 신청하기
                  </Button>
                </form>
              )}
            </div>

            <p className={styles.enrollNote}>
              수강 신청 후 대시보드에서 강좌를 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
