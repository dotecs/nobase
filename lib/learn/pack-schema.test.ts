import { describe, expect, it, vi } from 'vitest';
import { validatePack } from './pack-schema';
import { importValidated, message, readRepositoryPack } from '../../app/(admin)/admin/learn/packs/server';

vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: vi.fn(() => { throw new Error('Real DB access prohibited in tests'); }) }));

const uuid = '00000000-0000-4000-8000-000000000001';
function fixture() {
  return { pack: { id: 'p', title: 'Pack', version: 1, status: 'draft' }, units: [{ id: 'u', pack_id: 'p', order: 1, title: 'Unit', tier: 'mvp1' }], abilities: [{ id: 'a', pack_id: 'p', unit_id: 'u', order_in_unit: 1, name: 'A', action: 'Test', kind: 'procedure' }], edges: [] as unknown[], goals: { goals: [{ id: 'g', pack_id: 'p', title: 'Goal' }], requirements: [] }, materials: [], items: [] as unknown[], misconceptions: [], diagnostic: { id: uuid, goal_id: 'g', version: 1 } };
}
describe('content pack validation', () => {
  it('없는 선수 참조를 보고한다', () => { const p = fixture(); p.edges = [{ id: uuid, pack_id: 'p', source_id: 'missing', target_id: 'a', type: 'prerequisite', origin: 'coach' }]; expect(validatePack(p).errors.join()).toContain('없는 참조 abilities/missing'); });
  it('순환과 자기순환을 보고한다', () => { const p = fixture(); p.edges = [{ id: uuid, pack_id: 'p', source_id: 'a', target_id: 'a', type: 'prerequisite', origin: 'coach' }]; expect(validatePack(p).errors.join()).toContain('자기순환'); });
  it('reviewed 팩의 문항 0개는 오류, draft는 경고다', () => { const p = fixture(); expect(validatePack(p).errors).toEqual([]); expect(validatePack(p).warnings).toHaveLength(1); p.pack.status = 'reviewed'; expect(validatePack(p).errors.join()).toContain('문항 수 부족'); });
  it('중복 ID를 보고한다', () => { const p = fixture(); p.abilities.push(p.abilities[0]); expect(validatePack(p).errors.join()).toContain('중복 ID a'); });
  it('answer_spec의 유리수 형식과 판별 타입을 검사한다', () => { const p = fixture(); const item = { id: 'i', version: 1, ability_id: 'a', usage: 'practice', stem_md: '1+1', answer_type: 'number', answer_spec: { type: 'number', value: 2 } }; p.items = [item]; expect(validatePack(p).errors.join()).toContain('answer_spec'); p.items = [{ ...item, answer_spec: { type: 'fraction', value: '1/2' } }]; expect(validatePack(p).errors.join()).toContain('불일치'); });
  it('여러 노드의 prerequisite 순환을 검사한다', () => { const p = fixture(); p.abilities.push({ ...p.abilities[0], id: 'b', order_in_unit: 2 }); p.edges = ['a', 'b'].map((source, index) => ({ id: uuid.replace(/1$/, String(index + 1)), pack_id: 'p', source_id: source, target_id: index ? 'a' : 'b', type: 'prerequisite', origin: 'coach' })); expect(validatePack(p).errors.join()).toContain('prerequisite 순환'); });
});

describe('pack import without a remote database', () => {
  it('같은 팩 재가져오기는 모두 건너뛰고 변경 문항만 새 버전으로 저장한다', async () => {
    const store = new Map<string, Record<string, unknown>[]>();
    const client = { from(table: string) {
      if (!store.has(table)) store.set(table, []);
      const rows = store.get(table)!;
      return {
        select: () => ({ order: () => ({ range: async (start: number, end: number) => ({ data: structuredClone(rows.slice(start, end + 1)), error: null }) }) }),
        upsert: async (row: Record<string, unknown>, options: { onConflict: string }) => {
          const old = rows.find(value => options.onConflict.split(',').every(key => row[key] === value[key]));
          if (old) Object.assign(old, structuredClone(row)); else rows.push(structuredClone(row));
          return { error: null };
        },
        insert: async (row: Record<string, unknown>) => { rows.push(structuredClone(row)); return { error: null }; },
      };
    } } as unknown as Parameters<typeof importValidated>[0];
    const raw = fixture();
    raw.items = [{ id: 'i', version: 1, ability_id: 'a', usage: 'practice', stem_md: '1+1', answer_type: 'number', answer_spec: { type: 'number', value: '2' } }];
    const data = validatePack(raw).data!;
    const first = await importValidated(client, data);
    expect(first.added).toBeGreaterThan(0);
    expect(await importValidated(client, data)).toEqual({ added: 0, updated: 0, skipped: first.added });
    data.items[0].stem_md = '2+0';
    const changed = await importValidated(client, data);
    expect(changed.added).toBe(1);
    expect(store.get('learn_items')?.map(row => row.version)).toEqual([1, 2]);
    expect((await importValidated(client, data)).added).toBe(0);
  });
  it('실제 저장소 팩의 24개 소주제·23개 엣지를 검증한다', async () => {
    const result = validatePack(await readRepositoryPack('root-math'));
    expect(result.errors).toEqual([]);
    expect(result.data?.abilities).toHaveLength(24);
    expect(result.data?.edges).toHaveLength(23);
  });
  it('테이블 미적용 오류는 안내문으로 변환한다', () => {
    expect(message({ code: '42P01' })).toContain('마이그레이션 미적용');
    expect(message({ code: 'PGRST205' })).toContain('마이그레이션 미적용');
  });
});
