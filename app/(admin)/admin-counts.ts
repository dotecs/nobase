import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { AdminBadgeCounts } from './AdminSidebar';

/**
 * 사이드바 배지 + 대시보드 "할 일" 카드에 쓰는 처리 대기 건수.
 * - 입금 대기 수강신청 (enrollments.status = 'paused')
 * - 아직 어떤 기수에도 등록되지 않은 학생 회원
 * - 답변 대기 질문 (lesson_questions.is_answered = false)
 */
export async function getAdminBadgeCounts(): Promise<AdminBadgeCounts> {
  const supabase = await createServerSupabaseClient();

  const [pendingEnrollmentsRes, pendingQuestionsRes, studentsRes, enrolledRes] = await Promise.all([
    supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'paused'),
    supabase.from('lesson_questions').select('id', { count: 'exact', head: true }).eq('is_answered', false),
    supabase.from('profiles').select('user_id').eq('role', 'student'),
    supabase.from('enrollments').select('user_id'),
  ]);

  const enrolledIds = new Set(((enrolledRes.data || []) as { user_id: string }[]).map((e) => e.user_id));
  const unregisteredUsers = ((studentsRes.data || []) as { user_id: string }[]).filter(
    (p) => !enrolledIds.has(p.user_id),
  ).length;

  return {
    pendingEnrollments: pendingEnrollmentsRes.count ?? 0,
    pendingQuestions: pendingQuestionsRes.count ?? 0,
    unregisteredUsers,
  };
}
