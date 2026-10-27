import { describe, expect, it, vi, beforeEach } from 'vitest';
import { canTransition, cohortEndFilter, buildCohortEndEvents } from './enrollment-status';
import { updateEnrollmentStatus } from '@/app/(admin)/admin/users/actions';

const state = vi.hoisted(() => ({ status: 'active', role: 'admin', historyFails: false, race: false, events: [] as unknown[], updates: 0 }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'actor' } }, error: null }) },
  from: (table: string) => {
    let payload: { status: string } | undefined;
    const filters: Record<string, string> = {};
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { filters[key] = value; return query; },
      single: async () => ({ data: { role: state.role }, error: null }),
      maybeSingle: async () => ({ data: { id: '00000000-0000-4000-8000-000000000001', status: state.status }, error: null }),
      update: (value: { status: string }) => { payload = value; return query; },
      insert: async (value: unknown) => { if (state.historyFails) return { error: { message: 'test' } }; state.events.push(value); return { error: null }; },
      then: (resolve: (value: unknown) => unknown) => {
        if (table === 'enrollments' && payload) {
          if (state.race || state.status !== filters.status) return Promise.resolve({ data: [], error: null }).then(resolve);
          state.status = payload.status; state.updates++;
        }
        return Promise.resolve({ data: [{ id: filters.id }], error: null }).then(resolve);
      },
    };
    return query;
  },
}) }));

describe('enrollment status transitions', () => {
  it('기수 일괄 종료 대상은 해당 기수 active만', () => {
    const filter = cohortEndFilter('target');
    const rows = ['active', 'on_hold', 'paused', 'pending', 'ended'].flatMap(status => ['target', 'other'].map(cohort_id => ({ status, cohort_id })));
    expect(rows.filter(row => row.cohort_id === filter.cohort_id && row.status === filter.status)).toEqual([{ cohort_id: 'target', status: 'active' }]);
  });
  it('실제로 변경되어 반환된 행마다 이력 한 건 생성', () => {
    const rows = [{ id: 'a', user_id: 'u1' }, { id: 'b', user_id: 'u2' }];
    expect(buildCohortEndEvents(rows, '기수 수료', 'admin')).toEqual(rows.map(row => ({ enrollment_id: row.id, from_status: 'active', to_status: 'ended', reason: '기수 수료', actor_id: 'admin' })));
    expect(buildCohortEndEvents([], '기수 수료', 'admin')).toEqual([]);
  });
  it.each([['active', 'on_hold'], ['active', 'ended'], ['on_hold', 'active'], ['on_hold', 'ended'], ['ended', 'active'], ['paused', 'ended'], ['paused', 'active']])('%s → %s 허용', (from, to) => expect(canTransition(from, to)).toBe(true));
  it.each([['pending', 'active'], ['active', 'paused'], ['paused', 'on_hold'], ['ended', 'on_hold'], ['active', 'active']])('%s → %s 거부', (from, to) => expect(canTransition(from, to)).toBe(false));
});

describe('status action with mock DB only', () => {
  const input = { enrollmentId: '00000000-0000-4000-8000-000000000001', to: 'on_hold' as const, reason: '휴학 요청' };
  beforeEach(() => { Object.assign(state, { status: 'active', role: 'admin', historyFails: false, race: false, events: [], updates: 0 }); });
  it('변경과 처리자·사유 이력 저장', async () => {
    expect(await updateEnrollmentStatus(input)).toEqual({ ok: true });
    expect(state.status).toBe('on_hold');
    expect(state.events).toEqual([{ enrollment_id: input.enrollmentId, from_status: 'active', to_status: 'on_hold', reason: input.reason, actor_id: 'actor' }]);
  });
  it('동시 변경은 0행으로 거부하고 이력도 남기지 않는다', async () => {
    state.race = true;
    expect(await updateEnrollmentStatus(input)).toMatchObject({ ok: false, error: expect.stringContaining('다른 곳에서 먼저 변경됨') });
    expect(state.updates).toBe(0); expect(state.events).toEqual([]);
  });
  it('이력 실패를 알리되 상태는 되돌리지 않는다', async () => {
    state.historyFails = true;
    expect(await updateEnrollmentStatus(input)).toMatchObject({ ok: false, error: expect.stringContaining('이력 기록 실패') });
    expect(state.status).toBe('on_hold'); expect(state.updates).toBe(1);
  });
  it('관리자·전이·사유를 서버에서 검사한다', async () => {
    state.role = 'student'; expect((await updateEnrollmentStatus(input)).ok).toBe(false);
    state.role = 'admin'; state.status = 'pending'; expect((await updateEnrollmentStatus(input)).ok).toBe(false);
    state.status = 'active'; expect((await updateEnrollmentStatus({ ...input, reason: ' ' })).ok).toBe(false);
    expect(state.updates).toBe(0);
  });
});
