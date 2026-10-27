import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { templatize, generateVariants, validateStoredVariants, VariantRules } from './templatize';
import { solveItem } from './solve';
import { Rational } from './rational';
import { UnsupportedError } from './parse';

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
      expect(row.stem_md).toMatch(/^-/);
    });
  });
  it.each(['1/2 + 1/3', '2x+10=4', '3x-3>=4(x+3)-8'])('%s: 20개 본문·수준 보존', stem => {
    const type = stem.includes('/') ? 'fraction' : 'number';
    const variants = generateVariants(templatize(stem, type, rules), 20, seededRandom());
    expect(new Set(variants.map(row => row.stem_md)).size).toBe(20);
    variants.forEach(row => {
      expect(row.stem_md).not.toMatch(/\*|\(\(|\{p/);
      expect(solveItem(row.stem_md, type)).toEqual({ ok: true, answer_spec: row.answer_spec });
      if (row.answer_spec.type !== 'number' && row.answer_spec.type !== 'fraction') throw new Error('unexpected answer');
      const answer = Rational.parse(row.answer_spec.value);
      expect(answer.d === BigInt(1)).toBe(type === 'number');
      if (type === 'number') { expect(row.stem_md).not.toMatch(/(?<!\d)-?1x/); expect(answer.n).not.toBe(BigInt(0)); }
      expect(Math.abs(Number(answer.n) / Number(answer.d))).toBeLessThanOrEqual(rules.max_answer_abs);
      for (const match of row.stem_md.matchAll(/(\d+)\/(\d+)/g)) {
        expect(Number(match[1])).toBeLessThan(Number(match[2]));
        expect(new Rational(BigInt(match[1]), BigInt(match[2])).d).toBe(BigInt(match[2]));
      }
    });
    console.log(JSON.stringify({ seed: stem, variants: variants.slice(0, 5).map(row => ({ stem: row.stem_md, answer: row.answer_spec })) }));
  });
  it('LaTeX와 지시문은 그대로 두고 숫자만 바꾼다', () => {
    const variants = generateVariants(templatize('$\\frac{1}{2}+\\frac{1}{3}$을 계산하시오.', 'fraction', rules), 20, seededRandom());
    variants.forEach(row => expect(row.stem_md).toMatch(/^\$\\frac\{\d+\}\{\d+\}\+\\frac\{\d+\}\{\d+\}\$을 계산하시오\.$/));
  });
  it('숫자 개수·값 대응에 실패하면 unsupported로 명확히 실패한다', () => {
    expect(() => templatize('x=1/2; x+3', 'fraction', rules)).toThrow(UnsupportedError);
    expect(() => templatize('x=-2; x+3', 'number', rules)).toThrow('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
  });
  it('정수 범위와 정답 상한은 DB 설정을 따른다', () => {
    const variants = generateVariants(templatize('2x+10=4', 'number', { ...rules, integer_range: [2, 6], coefficient_range: [2, 6], max_answer_abs: 2, reduced_retry: 100 }), 5, seededRandom());
    variants.forEach(row => {
      expect([...row.stem_md.matchAll(/\d+/g)].every(match => Number(match[0]) >= 2 && Number(match[0]) <= 6)).toBe(true);
      if (row.answer_spec.type !== 'number') throw new Error('unexpected answer');
      expect(Math.abs(Number(row.answer_spec.value))).toBeLessThanOrEqual(2);
    });
  });
  it.each(['1/2 + 1/3', '2x+10=4', '3x-3>=4(x+3)-8'])('지시문과 네 가지 수학 구간: %s', stem => {
    for (const [open, close] of [['$', '$'], ['$$', '$$'], ['\\(', '\\)'], ['\\[', '\\]']]) {
      const text = `다음 문제를 푸시오. ${open}${stem}${close} 답을 적으세요.`;
      const type = stem.includes('/') ? 'fraction' : 'number';
      expect(solveItem(text, type)).toEqual(solveItem(stem, type));
      expect(solveItem(text, type).ok).toBe(true);
      expect(generateVariants(templatize(text, type, rules), 5, seededRandom())[0].stem_md).toContain('답을 적으세요.');
    }
  });
  it('복수 수학 구간은 unsupported', () => {
    expect(solveItem('$1+2$와 \\(3+4\\)', 'number')).toEqual({ ok: false, reason: 'unsupported' });
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
