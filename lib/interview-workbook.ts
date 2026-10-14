import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * 면접 대비 워크북 접근 권한
 *
 * 규칙: 아래를 모두 만족하는 수강 등록(enrollment)이 하나 이상 있으면 접근 가능
 *   - 소속 코스의 interview_workbook_enabled = true  (현재: 뇌지컬 트레이닝 'n-training')
 *   - enrollments.written_passed_at IS NOT NULL      (관리자가 '필기 합격' 처리)
 *   - enrollments.status IN ('active', 'ended')      (수강 중이거나 정상 종료 — 면접은 과정 종료 뒤에 오므로 ended 포함)
 * 관리자(profile.role = 'admin')는 항상 접근 가능.
 */

export const INTERVIEW_WORKBOOK_PATH = '/workbook/interview';

export type InterviewWorkbookAccess = {
  granted: boolean;
  reason: 'admin' | 'passed' | 'not_passed' | 'not_enrolled' | 'anonymous';
  /** 권한의 근거가 된 수강 등록 (학습 페이지 링크용) */
  enrollment?: { id: string; cohort_id: string; course_id: string; written_passed_at: string | null };
};

type EnrollmentRow = {
  id: string;
  cohort_id: string;
  status: string;
  written_passed_at: string | null;
  cohort: { course: { id: string; interview_workbook_enabled: boolean } | null } | null;
};

export async function getInterviewWorkbookAccess(
  userId: string | null | undefined,
  role?: string | null,
): Promise<InterviewWorkbookAccess> {
  if (!userId) return { granted: false, reason: 'anonymous' };
  if (role === 'admin') return { granted: true, reason: 'admin' };

  const supabase = await createServerSupabaseClient();
  const { data } = (await supabase
    .from('enrollments')
    .select(
      `
      id,
      cohort_id,
      status,
      written_passed_at,
      cohort:cohorts (
        course:courses ( id, interview_workbook_enabled )
      )
    `,
    )
    .eq('user_id', userId)
    .in('status', ['active', 'ended'])) as { data: EnrollmentRow[] | null };

  const eligible = (data || []).filter((e) => e.cohort?.course?.interview_workbook_enabled);
  if (eligible.length === 0) return { granted: false, reason: 'not_enrolled' };

  const passed = eligible.find((e) => e.written_passed_at);
  if (!passed) {
    const first = eligible[0];
    return {
      granted: false,
      reason: 'not_passed',
      enrollment: {
        id: first.id,
        cohort_id: first.cohort_id,
        course_id: first.cohort!.course!.id,
        written_passed_at: null,
      },
    };
  }

  return {
    granted: true,
    reason: 'passed',
    enrollment: {
      id: passed.id,
      cohort_id: passed.cohort_id,
      course_id: passed.cohort!.course!.id,
      written_passed_at: passed.written_passed_at,
    },
  };
}
