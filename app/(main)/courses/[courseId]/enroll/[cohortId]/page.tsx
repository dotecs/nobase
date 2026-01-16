import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header/Header'
import { Button } from '@/components'
import { Course, Cohort, Profile, Lesson } from '@/lib/database.types'
import { FaArrowLeft, FaBook, FaCalendarAlt, FaUsers, FaClock, FaCheckCircle, FaLock, FaPlay, FaList } from 'react-icons/fa'
import styles from './enroll.module.css'

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

  // 해당 기수의 레슨 목록 조회
  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('id, title, sort_order, is_published')
    .eq('cohort_id', cohortId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })

  const lessons = (lessonsData || []) as Lesson[]

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

  // 총 강의 시간 계산 (임시: 레슨당 평균 30분으로 가정)
  const totalDuration = lessons.length * 30

  return (
    <div className={styles.enrollPage}>
      <Header isLoggedIn={true} userName={profile?.name || user.email} userRole={profile?.role} />
      
      <main className={styles.enrollMain}>
        <Link href="/courses" className={styles.backLink}>
          <FaArrowLeft />
          <span>강좌 목록으로 돌아가기</span>
        </Link>

        <div className={styles.enrollLayout}>
          {/* 왼쪽: 강좌 정보 및 커리큘럼 */}
          <div className={styles.enrollContent}>
            {/* 강좌 헤더 */}
            <div className={styles.courseHeader}>
              <span className={styles.cohortBadge}>
                <FaUsers />
                {cohort.title}
              </span>
              <h1 className={styles.courseTitle}>{course.title}</h1>
              {course.description && (
                <p className={styles.courseDescription}>{course.description}</p>
              )}
            </div>

            {/* 강좌 통계 */}
            <div className={styles.courseStats}>
              <div className={styles.statItem}>
                <FaBook />
                <span>{lessons.length}개 레슨</span>
              </div>
              <div className={styles.statItem}>
                <FaClock />
                <span>총 {Math.floor(totalDuration / 60)}시간 {totalDuration % 60}분</span>
              </div>
              <div className={styles.statItem}>
                <FaCalendarAlt />
                <span>{formatDate(cohort.starts_at)} 시작</span>
              </div>
            </div>

            {/* 커리큘럼 섹션 */}
            <div className={styles.curriculumSection}>
              <h2 className={styles.sectionTitle}>
                <FaList />
                커리큘럼
              </h2>
              
              <div className={styles.lessonList}>
                {lessons.length > 0 ? (
                  lessons.map((lesson, index) => (
                    <div key={lesson.id} className={styles.lessonItem}>
                      <div className={styles.lessonNumber}>{index + 1}</div>
                      <div className={styles.lessonInfo}>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                      </div>
                      <div className={styles.lessonStatus}>
                        {existingEnrollment ? (
                          <FaPlay className={styles.playIcon} />
                        ) : (
                          index < 1 ? (
                            <span className={styles.previewBadge}>미리보기</span>
                          ) : (
                            <FaLock className={styles.lockIcon} />
                          )
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyLessons}>
                    <p>아직 등록된 레슨이 없습니다.</p>
                    <p>곧 커리큘럼이 업데이트될 예정입니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽: 결제 카드 */}
          <div className={styles.enrollSidebar}>
            <div className={styles.enrollCard}>
              {/* 썸네일 */}
              <div className={styles.cardThumbnail}>
                {course.thumbnail_url ? (
                  <Image
                    src={course.thumbnail_url}
                    alt={course.title}
                    fill
                    className={styles.thumbnailImage}
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder}>
                    <FaBook />
                  </div>
                )}
              </div>

              <div className={styles.cardContent}>
                {/* 가격 정보 */}
                <div className={styles.priceSection}>
                  <span className={styles.currentPrice}>무료</span>
                  {/* <span className={styles.originalPrice}>₩99,000</span> */}
                </div>

                {/* 수강신청 버튼 */}
                <div className={styles.enrollActions}>
                  {existingEnrollment ? (
                    <>
                      <div className={styles.enrolledBadge}>
                        <FaCheckCircle />
                        수강 중
                      </div>
                      <Link href={`/courses/${courseId}/cohorts/${cohortId}`} className={styles.fullWidth}>
                        <Button variant="primary" size="lg" fullWidth>
                          강좌 바로가기
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <form action={handleEnroll} className={styles.fullWidth}>
                      <Button type="submit" variant="primary" size="lg" fullWidth>
                        무료로 수강 신청하기
                      </Button>
                    </form>
                  )}
                </div>

                {/* 강좌 포함 내용 */}
                <div className={styles.includesList}>
                  <h4 className={styles.includesTitle}>이 강좌에 포함된 내용</h4>
                  <ul>
                    <li>
                      <FaBook />
                      <span>{lessons.length}개의 레슨</span>
                    </li>
                    <li>
                      <FaClock />
                      <span>평생 무제한 접근</span>
                    </li>
                    <li>
                      <FaUsers />
                      <span>커뮤니티 지원</span>
                    </li>
                  </ul>
                </div>

                {/* 기간 정보 */}
                <div className={styles.periodInfo}>
                  <div className={styles.periodItem}>
                    <span className={styles.periodLabel}>시작일</span>
                    <span className={styles.periodValue}>{formatDate(cohort.starts_at)}</span>
                  </div>
                  <div className={styles.periodItem}>
                    <span className={styles.periodLabel}>종료일</span>
                    <span className={styles.periodValue}>{formatDate(cohort.ends_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
