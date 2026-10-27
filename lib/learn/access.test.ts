import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasLearnAccess } from './access';

const mock = vi.hoisted(() => ({ role: 'student', enrolled: true, adminCreated: vi.fn(), filters: {} as Record<string, string>, select: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: async () => ({
  from: (table: string) => {
    // A student session cannot read the unpublished course; never use it for this join.
    if (table !== 'profiles') throw new Error('Enrollment query used the student session');
    return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: mock.role }, error: null }) }) }) };
  },
}) }));
vi.mock('@/lib/supabase-admin', () => ({ createAdminSupabaseClient: () => {
  mock.adminCreated();
  return { from: (table: string) => {
    expect(table).toBe('enrollments');
    const query = {
      select: (columns: string) => { mock.select(columns); return query; },
      eq: (key: string, value: string) => { mock.filters[key] = value; return query; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: mock.enrolled ? [{ cohort: { course: { slug: 'root-math' } } }] : [], error: null }).then(resolve),
    };
    return query;
  } };
} }));

describe('learn access to an unpublished course', () => {
  beforeEach(() => { mock.role = 'student'; mock.enrolled = true; mock.filters = {}; vi.clearAllMocks(); });
  it('비공개 과정 등록자는 service role 조회로 enrolled', async () => {
    expect(await hasLearnAccess('authenticated-student')).toEqual({ granted: true, reason: 'enrolled' });
    expect(mock.adminCreated).toHaveBeenCalledOnce();
    expect(mock.select).toHaveBeenCalledWith('id, cohort:cohorts!inner(course:courses!inner(slug))');
    expect(mock.filters).toEqual({ user_id: 'authenticated-student', status: 'active', 'cohort.course.slug': 'root-math' });
  });
  it('미등록 학생은 not_enrolled', async () => {
    mock.enrolled = false;
    expect(await hasLearnAccess('authenticated-student')).toEqual({ granted: false, reason: 'not_enrolled' });
  });
  it('관리자는 기존 세션 판정으로 admin, 등록 조회 생략', async () => {
    mock.role = 'admin';
    expect(await hasLearnAccess('authenticated-admin')).toEqual({ granted: true, reason: 'admin' });
    expect(mock.adminCreated).not.toHaveBeenCalled();
  });
});
