import { createServerSupabaseClient } from '@/lib/supabase-server';
import AdminPageHeader from '../AdminPageHeader';
import styles from '../admin.module.css';
import UserEnrollPanel, { type PanelCohort, type PanelUser } from './UserEnrollPanel';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const supabase = await createServerSupabaseClient();

  // 사용자 목록 — profiles ↔ enrollments 는 직접 FK가 없어(둘 다 auth.users 참조) 따로 조회해 코드에서 합친다
  const { data: usersData } = (await supabase
    .from('profiles')
    .select('user_id, name, email, phone, role, created_at')
    .order('created_at', { ascending: false })) as { data: any[] | null };

  const { data: enrollmentsData } = (await supabase
    .from('enrollments')
    .select('id, user_id, status, cohort_id, cohort:cohorts ( title, course:courses ( title ) )')) as {
    data: any[] | null;
  };

  const enrollmentsByUser = new Map<string, PanelUser['enrollments']>();
  for (const e of enrollmentsData || []) {
    const list = enrollmentsByUser.get(e.user_id) ?? [];
    list.push({
      id: e.id,
      status: e.status,
      cohort_id: e.cohort_id,
      cohort_title: e.cohort?.title ?? '',
      course_title: e.cohort?.course?.title ?? '',
    });
    enrollmentsByUser.set(e.user_id, list);
  }

  const users: PanelUser[] = (usersData || []).map((u) => ({
    user_id: u.user_id,
    name: u.name ?? null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    role: u.role === 'admin' ? 'admin' : 'student',
    created_at: u.created_at,
    enrollments: enrollmentsByUser.get(u.user_id) ?? [],
  }));

  // 등록 대상 기수 (활성 먼저, 최근 시작 순)
  const { data: cohortsData } = (await supabase
    .from('cohorts')
    .select('id, title, is_active, starts_at, course_id, course:courses ( title )')
    .order('is_active', { ascending: false })
    .order('starts_at', { ascending: false, nullsFirst: false })) as { data: any[] | null };

  const cohorts: PanelCohort[] = (cohortsData || []).map((c) => ({
    id: c.id,
    title: c.title,
    is_active: !!c.is_active,
    starts_at: c.starts_at ?? null,
    course_id: c.course_id,
    course_title: c.course?.title ?? '',
  }));

  const newCount = users.filter((u) => u.role !== 'admin' && u.enrollments.length === 0).length;

  return (
    <main className={styles.main}>
      <AdminPageHeader
        title="사용자 관리"
        description={`가입 회원을 조회하고 기수에 등록합니다 · 미등록 신규 ${newCount}명`}
      />

      {/* 사용자 목록 + 기수 등록 */}
      <div className={styles.plainSection}>
        <UserEnrollPanel users={users} cohorts={cohorts} />
      </div>
    </main>
  );
}
