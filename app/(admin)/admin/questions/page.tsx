import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { FaQuestionCircle, FaCheckCircle, FaHourglassHalf, FaFilter } from 'react-icons/fa';
import { Course, Lesson, LessonQuestionWithDetails } from '@/lib/database.types';
import QuestionManager from './QuestionManager';
import FilterSelects from './FilterSelects';
import styles from './questions.module.css';

interface AdminQuestionsPageProps {
  searchParams: Promise<{
    status?: 'all' | 'pending' | 'answered';
    courseId?: string;
    lessonId?: string;
  }>;
}

export default async function AdminQuestionsPage({ searchParams }: AdminQuestionsPageProps) {
  const params = await searchParams;
  const status = params.status || 'all';
  const courseId = params.courseId;
  const lessonId = params.lessonId;

  const supabase = await createServerSupabaseClient();

  // Fetch all courses for filter
  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, title')
    .order('title');

  const courses = (coursesData || []) as Pick<Course, 'id' | 'title'>[];

  // Fetch lessons for selected course
  let lessons: Pick<Lesson, 'id' | 'title'>[] = [];
  if (courseId) {
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('id, title')
      .eq('course_id', courseId)
      .order('sort_order');
    
    lessons = (lessonsData || []) as Pick<Lesson, 'id' | 'title'>[];
  }

  // Build questions query
  let query = supabase
    .from('lesson_questions')
    .select(`
      *,
      lesson_answers (*),
      lessons (
        id,
        title,
        courses (
          id,
          title
        )
      )
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (status === 'pending') {
    query = query.eq('is_answered', false);
  } else if (status === 'answered') {
    query = query.eq('is_answered', true);
  }

  if (lessonId) {
    query = query.eq('lesson_id', lessonId);
  } else if (courseId) {
    // Get all lessons for the course
    const { data: courseLessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId) as { data: { id: string }[] | null };
    
    if (courseLessons && courseLessons.length > 0) {
      const lessonIds = courseLessons.map(l => l.id);
      query = query.in('lesson_id', lessonIds);
    }
  }

  const { data: questionsData, error } = await query as { 
    data: Array<{ user_id: string; [key: string]: unknown }> | null; 
    error: { code?: string; message?: string } | null 
  };

  if (error) {
    console.error('Error fetching questions:', error);
    // Table might not exist yet
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log('lesson_questions table does not exist. Please run migration 019_lesson_questions.sql');
    }
  }

  // Fetch profiles for all question authors
  let questionsWithProfiles: LessonQuestionWithDetails[] = [];
  
  if (questionsData && questionsData.length > 0) {
    const userIds = [...new Set(questionsData.map(q => q.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds) as { data: Array<{ user_id: string; name: string | null }> | null };
    
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    
    questionsWithProfiles = questionsData.map(q => ({
      ...q,
      profiles: profileMap.get(q.user_id as string) || null,
    })) as LessonQuestionWithDetails[];
  }

  const questions = questionsWithProfiles;

  // Count stats - handle case where table doesn't exist
  let totalCount = 0;
  let pendingCount = 0;
  let answeredCount = 0;

  if (!error) {
    const { count: total } = await supabase
      .from('lesson_questions')
      .select('*', { count: 'exact', head: true });
    totalCount = total || 0;

    const { count: pending } = await supabase
      .from('lesson_questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_answered', false);
    pendingCount = pending || 0;

    const { count: answered } = await supabase
      .from('lesson_questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_answered', true);
    answeredCount = answered || 0;
  }

  return (
    <main className={styles.main}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>질문 관리</h1>
          <p>수강생들의 질문을 확인하고 답변합니다</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaQuestionCircle />
          </div>
          <div className={styles.statInfo}>
            <h3>{totalCount || 0}</h3>
            <p>전체 질문</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.pending}`}>
          <div className={styles.statIcon}>
            <FaHourglassHalf />
          </div>
          <div className={styles.statInfo}>
            <h3>{pendingCount || 0}</h3>
            <p>답변 대기</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.answered}`}>
          <div className={styles.statIcon}>
            <FaCheckCircle />
          </div>
          <div className={styles.statInfo}>
            <h3>{answeredCount || 0}</h3>
            <p>답변 완료</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <Link href="/admin" className={styles.tab}>
          강좌 관리
        </Link>
        <Link href="/admin/cohorts" className={styles.tab}>
          기수 관리
        </Link>
        <Link href="/admin/enrollments" className={styles.tab}>
          수강신청 관리
        </Link>
        <Link href="/admin/users" className={styles.tab}>
          사용자 관리
        </Link>
        <Link href="/admin/questions" className={`${styles.tab} ${styles.active}`}>
          질문 관리
        </Link>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label><FaFilter /> 상태</label>
          <div className={styles.filterButtons}>
            <Link
              href={`/admin/questions?status=all${courseId ? `&courseId=${courseId}` : ''}${lessonId ? `&lessonId=${lessonId}` : ''}`}
              className={`${styles.filterBtn} ${status === 'all' ? styles.active : ''}`}
            >
              전체
            </Link>
            <Link
              href={`/admin/questions?status=pending${courseId ? `&courseId=${courseId}` : ''}${lessonId ? `&lessonId=${lessonId}` : ''}`}
              className={`${styles.filterBtn} ${status === 'pending' ? styles.active : ''}`}
            >
              답변 대기
            </Link>
            <Link
              href={`/admin/questions?status=answered${courseId ? `&courseId=${courseId}` : ''}${lessonId ? `&lessonId=${lessonId}` : ''}`}
              className={`${styles.filterBtn} ${status === 'answered' ? styles.active : ''}`}
            >
              답변 완료
            </Link>
          </div>
        </div>

        <FilterSelects
          status={status}
          courseId={courseId}
          lessonId={lessonId}
          courses={courses}
          lessons={lessons}
        />
      </div>

      {/* Questions List */}
      <QuestionManager questions={questions} />
    </main>
  );
}
