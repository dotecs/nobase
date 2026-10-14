import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import AdminPageHeader from '../AdminPageHeader';
import styles from './enrollments.module.css';

export const dynamic = 'force-dynamic';

type EnrollmentWithDetails = {
  id: string;
  user_id: string;
  cohort_id: string;
  status: string;
  depositor_name: string | null;
  receipt_contact: string | null;
  written_passed_at: string | null;
  created_at: string;
  profile: {
    user_id: string;
    name: string | null;
  } | null;
  cohort: {
    id: string;
    title: string;
    price: number | null;
    course: {
      id: string;
      title: string;
      interview_workbook_enabled: boolean;
    };
  };
};

export default async function AdminEnrollmentsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  // Fetch all enrollments with user and cohort details
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      user_id,
      cohort_id,
      status,
      depositor_name,
      receipt_contact,
      written_passed_at,
      created_at,
      cohort:cohorts (
        id,
        title,
        price,
        course:courses (
          id,
          title,
          interview_workbook_enabled
        )
      )
    `)
    .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

  if (error) {
    console.error('Error fetching enrollments:', error);
  }

  // Fetch profiles separately
  const userIds = (enrollments || []).map(e => e.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, name')
    .in('user_id', userIds) as { data: { user_id: string; name: string | null }[] | null };

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  // Combine enrollments with profiles
  const typedEnrollments = (enrollments || []).map(e => ({
    ...e,
    profile: profileMap.get(e.user_id) || null
  })) as unknown as EnrollmentWithDetails[];

  // Separate by status
  const pendingEnrollments = typedEnrollments.filter(e => e.status === 'paused');
  const activeEnrollments = typedEnrollments.filter(e => e.status === 'active');
  const otherEnrollments = typedEnrollments.filter(e => e.status !== 'paused' && e.status !== 'active');

  async function approveEnrollment(formData: FormData) {
    'use server';

    const enrollmentId = formData.get('enrollmentId') as string;
    const supabase = await createServerSupabaseClient() as any;

    const result = await supabase
      .from('enrollments')
      .update({ status: 'active' })
      .eq('id', enrollmentId);

    if (result.error) {
      console.error('Error approving enrollment:', result.error);
    }

    revalidatePath('/admin/enrollments');
  }

  async function rejectEnrollment(formData: FormData) {
    'use server';

    const enrollmentId = formData.get('enrollmentId') as string;
    const supabase = await createServerSupabaseClient() as any;

    const result = await supabase
      .from('enrollments')
      .update({ status: 'cancelled' })
      .eq('id', enrollmentId);

    if (result.error) {
      console.error('Error rejecting enrollment:', result.error);
    }

    revalidatePath('/admin/enrollments');
  }

  // 면접 워크북: 필기 합격 처리 / 해제 (courses.interview_workbook_enabled 코스에서만 노출)
  async function toggleWrittenPassed(formData: FormData) {
    'use server';

    const enrollmentId = formData.get('enrollmentId') as string;
    const grant = formData.get('grant') === '1';
    const supabase = await createServerSupabaseClient() as any;

    // 관리자 확인 (DB RLS enrollments_admin_all 이 1차 방어, 여기는 2차 방어)
    const { data: { user: actor } } = await supabase.auth.getUser();
    if (!actor) return;
    const { data: actorProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', actor.id)
      .single();
    if (actorProfile?.role !== 'admin') {
      console.warn('toggleWrittenPassed: non-admin attempt', actor.id);
      return;
    }

    const result = await supabase
      .from('enrollments')
      .update({ written_passed_at: grant ? new Date().toISOString() : null })
      .eq('id', enrollmentId);

    if (result.error) {
      console.error('Error toggling written_passed_at:', result.error);
    }

    revalidatePath('/admin/enrollments');
    revalidatePath('/workbook/interview');
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '무료';
    return `₩${price.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paused':
        return <span className={`${styles.statusBadge} ${styles.paused}`}>입금 대기</span>;
      case 'active':
        return <span className={`${styles.statusBadge} ${styles.active}`}>수강 중</span>;
      case 'completed':
        return <span className={`${styles.statusBadge} ${styles.completed}`}>수강 완료</span>;
      case 'cancelled':
        return <span className={`${styles.statusBadge} ${styles.cancelled}`}>취소됨</span>;
      default:
        return <span className={styles.statusBadge}>{status}</span>;
    }
  };

  // 면접 워크북 열 — 코스에 워크북이 연결된 경우에만 토글 버튼 표시
  // 버튼 하나가 켜기/끄기를 모두 담당: 미처리 → [필기 합격], 처리됨 → [합격 ✓] (누르면 해제)
  const renderWorkbookCell = (enrollment: EnrollmentWithDetails) => {
    if (!enrollment.cohort?.course?.interview_workbook_enabled) {
      return <span className={styles.workbookNa}>-</span>;
    }
    const passed = !!enrollment.written_passed_at;
    return (
      <form action={toggleWrittenPassed}>
        <input type="hidden" name="enrollmentId" value={enrollment.id} />
        <input type="hidden" name="grant" value={passed ? '0' : '1'} />
        <button
          type="submit"
          className={passed ? styles.passedToggleOn : styles.passedToggleOff}
          title={passed ? '필기 합격 처리됨 — 누르면 워크북 접근 해제' : '필기 합격 처리 → 면접 워크북 열기'}
          aria-pressed={passed}
        >
          {passed ? '합격 ✓' : '필기 합격'}
        </button>
      </form>
    );
  };

  const passedCount = typedEnrollments.filter(e => e.written_passed_at).length;

  return (
    <div className={styles.container}>
      <AdminPageHeader
        title="수강신청 관리"
        description={`입금 대기 ${pendingEnrollments.length}건 · 수강 중 ${activeEnrollments.length}건 · 필기 합격(면접 워크북) ${passedCount}명`}
      />

      {/* 입금 대기 목록 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          입금 대기 <span className={styles.count}>{pendingEnrollments.length}</span>
        </h2>

        {pendingEnrollments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>입금 대기 중인 신청이 없습니다.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>코스</th>
                  <th>기수</th>
                  <th>신청자</th>
                  <th>입금자명</th>
                  <th>금액</th>
                  <th>현금영수증</th>
                  <th>신청일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {pendingEnrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>{enrollment.cohort?.course?.title}</td>
                    <td>{enrollment.cohort?.title}</td>
                    <td>{enrollment.profile?.name || '-'}</td>
                    <td className={styles.highlight}>{enrollment.depositor_name || '-'}</td>
                    <td>{formatPrice(enrollment.cohort?.price)}</td>
                    <td>{enrollment.receipt_contact || '-'}</td>
                    <td>{formatDate(enrollment.created_at)}</td>
                    <td>
                      <div className={styles.tableActions}>
                        <form action={approveEnrollment}>
                          <input type="hidden" name="enrollmentId" value={enrollment.id} />
                          <button type="submit" className={styles.approveButtonSmall}>
                            확인
                          </button>
                        </form>
                        <form action={rejectEnrollment}>
                          <input type="hidden" name="enrollmentId" value={enrollment.id} />
                          <button type="submit" className={styles.rejectButtonSmall}>
                            취소
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 활성 수강 목록 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          수강 중 <span className={styles.count}>{activeEnrollments.length}</span>
        </h2>

        {activeEnrollments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>현재 수강 중인 학생이 없습니다.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>코스</th>
                  <th>기수</th>
                  <th>수강생</th>
                  <th>현금영수증</th>
                  <th>신청일</th>
                  <th>상태</th>
                  <th>면접 워크북</th>
                </tr>
              </thead>
              <tbody>
                {activeEnrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>{enrollment.cohort?.course?.title}</td>
                    <td>{enrollment.cohort?.title}</td>
                    <td>{enrollment.profile?.name || '-'}</td>
                    <td>{enrollment.receipt_contact || '-'}</td>
                    <td>{formatDate(enrollment.created_at)}</td>
                    <td>{getStatusBadge(enrollment.status)}</td>
                    <td>{renderWorkbookCell(enrollment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 기타 (완료/취소) */}
      {otherEnrollments.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            완료/취소 <span className={styles.count}>{otherEnrollments.length}</span>
          </h2>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>코스</th>
                  <th>기수</th>
                  <th>수강생</th>
                  <th>신청일</th>
                  <th>상태</th>
                  <th>면접 워크북</th>
                </tr>
              </thead>
              <tbody>
                {otherEnrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>{enrollment.cohort?.course?.title}</td>
                    <td>{enrollment.cohort?.title}</td>
                    <td>{enrollment.profile?.name || '-'}</td>
                    <td>{formatDate(enrollment.created_at)}</td>
                    <td>{getStatusBadge(enrollment.status)}</td>
                    <td>{enrollment.status === 'ended' ? renderWorkbookCell(enrollment) : <span className={styles.workbookNa}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
