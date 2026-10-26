import { describe, expect, it } from 'vitest';
import { validatePack } from './pack-schema';

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
