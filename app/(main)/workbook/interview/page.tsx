import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header, ErrorPage } from '@/components';
import { Profile } from '@/lib/database.types';
import { getInterviewWorkbookAccess, INTERVIEW_WORKBOOK_PATH } from '@/lib/interview-workbook';
import InterviewWorkbook from './InterviewWorkbook';
import type { WorkbookAnswers } from './actions';
import styles from './workbook.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SSIT 면접 대비 워크북 - 노베이스구조대',
  description:
    '필기 합격 후 면접을 앞둔 뇌지컬 트레이닝 수강생을 위한 SSIT 면접 대비 워크북. 면접 개요, PPT 발표 가이드, 예상 질문, 입학지원서 문항 정리, 모의면접 체크리스트.',
};

export default async function InterviewWorkbookPage() {
  const user = await getUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(INTERVIEW_WORKBOOK_PATH)}`);
  }

  const profile = (await getProfile()) as Profile | null;
  const access = await getInterviewWorkbookAccess(user.id, profile?.role);

  if (!access.granted) {
    const isEnrolled = access.reason === 'not_passed';
    return (
      <div className={styles.page}>
        <Header userName={profile?.name || user.email} isLoggedIn={true} userRole={profile?.role} />
        <ErrorPage
          icon="lock"
          title={isEnrolled ? '필기 합격 후 열리는 자료입니다' : '접근 권한이 없습니다'}
          description={
            isEnrolled
              ? 'SSIT 면접 대비 워크북은 뇌지컬 트레이닝 수강생 중 필기 합격 소식을 전해주신 분께 열어드립니다. 필기에 합격하셨다면 카카오톡 채널로 알려주세요. 확인 후 바로 열어드립니다.'
              : '이 자료는 뇌지컬 트레이닝 수강생 전용입니다.'
          }
          primaryAction={
            isEnrolled && access.enrollment
              ? {
                  label: '학습 페이지로 이동',
                  href: `/courses/${access.enrollment.course_id}/cohorts/${access.enrollment.cohort_id}`,
                }
              : { label: '대시보드로 이동', href: '/dashboard' }
          }
        />
      </div>
    );
  }

  // 저장된 답변 불러오기
  const supabase = await createServerSupabaseClient();
  const { data: saved } = (await supabase
    .from('interview_workbook_answers')
    .select('answers, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()) as { data: { answers: WorkbookAnswers; updated_at: string } | null };

  const displayName = profile?.name?.trim() || user.email?.split('@')[0] || '수강생';
  const backHref = access.enrollment
    ? `/courses/${access.enrollment.course_id}/cohorts/${access.enrollment.cohort_id}`
    : '/dashboard';

  return (
    <div className={styles.page}>
      <Header userName={profile?.name || user.email} isLoggedIn={true} userRole={profile?.role} />
      <InterviewWorkbook
        displayName={displayName}
        initialAnswers={saved?.answers ?? {}}
        initialSavedAt={saved?.updated_at ?? null}
        passedAt={access.enrollment?.written_passed_at ?? null}
        backHref={backHref}
      />
    </div>
  );
}
