import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header/Header'
import { Course, Cohort, Profile, Lesson, LessonVideo } from '@/lib/database.types'
import { FaArrowLeft, FaBook, FaCalendarAlt, FaUsers, FaClock, FaLock, FaList } from 'react-icons/fa'
import styles from './enroll.module.css'
import { PreviewButton } from './PreviewModal'
import EnrollActions from './EnrollActions'

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

  // 현재 등록된 수강생 수 조회 (active + paused 모두 포함)
  const { count: enrollmentCount } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('cohort_id', cohortId)
    .in('status', ['active', 'paused'])

  const currentEnrollments = enrollmentCount || 0
  const maxStudents = cohort.max_students
  const remainingSpots = maxStudents ? maxStudents - currentEnrollments : null
  const isFull = maxStudents ? currentEnrollments >= maxStudents : false

  // 해당 강좌의 레슨 목록 조회 (수강신청 페이지에서는 전체 커리큘럼 표시 - is_published 상관없이)
  const { data: lessonsData, error: lessonsError } = await supabase
    .from('lessons')
    .select('id, title, description, sort_order, is_published, is_free')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })

  if (lessonsError) {
    console.error('Lessons fetch error:', lessonsError)
  }

  const lessons = (lessonsData || []) as (Lesson & { is_free?: boolean })[]

  // 무료 공개 레슨의 영상 정보 조회
  const freeLessonIds = lessons.filter(l => l.is_free).map(l => l.id)
  let lessonVideosMap: Record<string, LessonVideo[]> = {}
  
  if (freeLessonIds.length > 0) {
    const { data: videosData } = await supabase
      .from('lesson_videos')
      .select('*')
      .in('lesson_id', freeLessonIds)
      .order('sort_order', { ascending: true })
    
    if (videosData) {
      lessonVideosMap = (videosData as LessonVideo[]).reduce((acc, video) => {
        if (!acc[video.lesson_id]) {
          acc[video.lesson_id] = []
        }
        acc[video.lesson_id].push(video)
        return acc
      }, {} as Record<string, LessonVideo[]>)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '미정'
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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
              {maxStudents && (
                <div className={styles.statItem}>
                  <FaUsers />
                  <span>정원 {currentEnrollments}/{maxStudents}명</span>
                </div>
              )}
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
                        {lesson.description && (
                          <span className={styles.lessonDescription}>{lesson.description}</span>
                        )}
                      </div>
                      <div className={styles.lessonStatus}>
                        {existingEnrollment ? (
                          null
                        ) : (
                          lesson.is_free ? (
                            <PreviewButton 
                              lessonTitle={lesson.title}
                              videos={lessonVideosMap[lesson.id] || []}
                            />
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
                {/* 정원 정보 */}
                {maxStudents && (
                  <div className={styles.capacitySection}>
                    <div className={styles.capacityHeader}>
                      <span className={styles.capacityLabel}>수강 정원</span>
                      <span className={styles.capacityCount}>
                        {currentEnrollments} / {maxStudents}명
                      </span>
                    </div>
                    <div className={styles.capacityBar}>
                      <div 
                        className={`${styles.capacityFill} ${isFull ? styles.capacityFull : ''}`}
                        style={{ width: `${Math.min((currentEnrollments / maxStudents) * 100, 100)}%` }}
                      />
                    </div>
                    {remainingSpots !== null && remainingSpots > 0 && (
                      <span className={styles.remainingSpots}>
                        {remainingSpots}자리 남음
                      </span>
                    )}
                    {isFull && (
                      <span className={styles.fullBadge}>마감</span>
                    )}
                  </div>
                )}

                {/* 가격 정보 */}
                <div className={styles.priceSection}>
                  {cohort.price === 0 ? (
                    <span className={styles.currentPrice}>무료</span>
                  ) : (
                    <>
                      <span className={styles.currentPrice}>
                        ₩{cohort.price.toLocaleString()}
                      </span>
                      {cohort.original_price && cohort.original_price > cohort.price && (
                        <span className={styles.originalPrice}>
                          ₩{cohort.original_price.toLocaleString()}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* 수강신청 버튼 */}
                <EnrollActions
                  cohortId={cohortId}
                  courseId={courseId}
                  userId={user.id}
                  price={cohort.price}
                  courseName={course.title}
                  cohortName={cohort.title}
                  isFull={isFull}
                  existingEnrollment={existingEnrollment}
                />

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
                      <span>한 학기 동안 무제한 접근</span>
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
