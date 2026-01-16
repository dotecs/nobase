import { redirect } from 'next/navigation';
import { createServerSupabaseClient, getUser } from '@/lib/supabase-server';
import { Button, ErrorPage } from '@/components';
import { FaCheckCircle } from 'react-icons/fa';
import styles from '../start.module.css';

interface DonePageProps {
  searchParams: Promise<{
    courseId?: string;
    cohortId?: string;
  }>;
}

export default async function DonePage({ searchParams }: DonePageProps) {
  const { courseId, cohortId } = await searchParams;

  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  if (!courseId || !cohortId) {
    return (
      <ErrorPage
        icon="link"
        title="잘못된 접근입니다"
        description="올바른 경로로 접근해 주세요."
        primaryAction={{
          label: '대시보드로 이동',
          href: '/dashboard',
        }}
      />
    );
  }

  const supabase = await createServerSupabaseClient();

  // 등록 확인
  const { data: enrollmentData } = await supabase
    .from('enrollments')
    .select(`
      *,
      cohorts (
        *,
        courses (*)
      )
    `)
    .eq('user_id', user.id)
    .eq('cohort_id', cohortId)
    .single();

  const enrollment = enrollmentData as any;

  if (!enrollment) {
    return (
      <ErrorPage
        icon="sad"
        title="등록 정보를 찾을 수 없습니다"
        description="수강 등록이 완료되지 않았습니다. 다시 시도해 주세요."
        primaryAction={{
          label: '대시보드로 이동',
          href: '/dashboard',
        }}
      />
    );
  }

  const cohort = enrollment.cohorts;
  const course = cohort?.courses;

  return (
    <div className={styles.onboardingPage}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.successIcon}><FaCheckCircle /></div>
            <h1 className={styles.title}>수강 등록 완료!</h1>
            <p className={styles.successMessage}>
              <strong>{course?.title}</strong>의 <strong>{cohort?.title}</strong>에
              성공적으로 등록되었습니다.<br />
              지금 바로 학습을 시작해 보세요!
            </p>
          </div>

          <div className={styles.actions}>
            <Button 
              href={`/courses/${courseId}/cohorts/${cohortId}/curriculum`}
              fullWidth
            >
              커리큘럼 보기
            </Button>
            <Button 
              href={`/courses/${courseId}/cohorts/${cohortId}`}
              variant="outline"
              fullWidth
            >
              강좌 홈으로 이동
            </Button>
            <Button href="/dashboard" variant="ghost" fullWidth>
              대시보드로 이동
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
