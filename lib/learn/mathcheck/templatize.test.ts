import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { templatize, generateVariants, validateStoredVariants, VariantRules } from './templatize';
import { solveItem } from './solve';

const sql = readFileSync('supabase/migrations/040_learn_content.sql', 'utf8');
const rules = VariantRules.parse(JSON.parse(sql.match(/\('variants', 1, '([^']+)'::jsonb\)/)![1]));
function seededRandom() { let seed = 20261026; return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }; }
describe('server-generated templates and variants', () => {
  it.each([['04-3', '$\\frac{1}{2}+\\frac{1}{3}$', 'fraction'], ['05-3', '2x+10=4', 'number']] as const)('%s에서 20개 모두 검증 통과·중복 0', (_ability, stem, type) => {
    const template = templatize(stem, type, rules);
    const variants = generateVariants(template, 20, seededRandom());
    expect(variants).toHaveLength(20);
    expect(new Set(variants.map(row => row.stem_md)).size).toBe(20);
    const seed = template.pattern.replace(/\{p(\d+)\}/g, (_, index: string) => template.params.values[Number(index)].original);
    expect(variants.some(row => row.stem_md === seed)).toBe(false);
    for (const variant of variants) expect(solveItem(variant.stem_md, variant.answer_type)).toEqual({ ok: true, answer_spec: variant.answer_spec });
    expect(validateStoredVariants(variants)).toEqual(variants);
    expect(template.params.rules).toEqual(rules);
  });
  it('DB의 기본 개수와 용도 배분을 따른다', () => {
    const template = templatize('1/2+1/3', 'fraction', rules);
    expect(generateVariants(template, rules.count_default, seededRandom()).map(row => row.usage)).toEqual(['practice', 'practice', 'review', 'assessment', 'assessment']);
  });
  it('변경된 분모 범위·서로 다른 분모·음수 부호를 지킨다', () => {
    const template = templatize('-1/2+1/3', 'fraction', { ...rules, denominator_range: [7, 9] });
    const variants = generateVariants(template, 20, seededRandom());
    variants.forEach(row => {
      const denominators = [...row.stem_md.matchAll(/\/(\d+)/g)].map(match => Number(match[1]));
      expect(denominators).toHaveLength(2); expect(new Set(denominators).size).toBe(2);
      expect(denominators.every(value => value >= 7 && value <= 9)).toBe(true);
      expect(row.stem_md).toContain('(-');
    });
  });
  it('정답 없는 변형·변조된 정답을 거부한다', () => {
    const [variant] = generateVariants(templatize('1/2+1/3', 'fraction', rules), 1, seededRandom());
    expect(() => validateStoredVariants([{ ...variant, answer_spec: null }])).toThrow();
    expect(() => validateStoredVariants([{ ...variant, answer_spec: { type: 'fraction', value: '42' } }])).toThrow('변형 정답 검증 실패');
  });
  it('범위가 부족하면 재시도 한도에서 끝나고 일부 결과를 반환하지 않는다', () => {
    const template = templatize('1+1', 'number', rules);
    template.params.values.forEach(value => { value.range = [1, 1]; });
    template.params.rules.reduced_retry = 2;
    expect(() => generateVariants(template, 3, seededRandom())).toThrow('재시도 한도');
  });
});
