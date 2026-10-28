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
  it('약분 문항 5개는 공약수가 있고 기약 정답이 중복되지 않는다', () => {
    const template = templatize('다음을 약분하시오. $12/18$', 'fraction', rules, {type:'fraction',value:'2/3',require_reduced:true});
    const rows = generateVariants(template, 5, seededRandom());
    expect(validateStoredVariants(rows)).toEqual(rows);
    const answers = rows.map(row => {
      const match = row.stem_md.match(/\$(\d+)\/(\d+)\$/)!;
      const n = BigInt(match[1]), d = BigInt(match[2]), reduced = new Rational(n,d);
      expect(n / reduced.n >= BigInt(2)).toBe(true);
      expect(n / reduced.n <= BigInt(6)).toBe(true);
      expect(Number(reduced.d)).toBeGreaterThanOrEqual(rules.denominator_range[0]);
      expect(Number(reduced.d)).toBeLessThanOrEqual(rules.denominator_range[1]);
      expect(row.answer_spec).toMatchObject({type:'fraction',value:reduced.toString(),require_reduced:true});
      return reduced.toString();
    });
    expect(new Set(answers).size).toBe(5);
    expect(templatize('$12/18$','fraction',rules,{type:'fraction',value:'2/3',require_reduced:false}).params.reduce_fraction).toBe(false);
  });
  it('괄호 바로 앞 숫자는 coefficient 범위이며 1(x+...)를 만들지 않는다',()=>{
    const template=templatize('2(x+10)=24','number',rules);expect(template.params.values[0]).toMatchObject({role:'coefficient',range:rules.coefficient_range});
    for(const row of generateVariants(template,20,seededRandom())){expect(row.stem_md).not.toMatch(/^1\(/);expect(Number(row.stem_md.match(/^\d+/)![0])).toBeGreaterThanOrEqual(2);}
  });
  it('분수 덧셈·뺄셈 분모의 최소공배수는 설정 상한 이하이다',()=>{
    for(const sign of ['+','-'])for(const row of generateVariants(templatize(`1/2${sign}1/3`,'fraction',{...rules,max_lcd:30}),20,seededRandom())){
      const ds=[...row.stem_md.matchAll(/\/(\d+)/g)].map(m=>BigInt(m[1]));const lcd=ds.reduce((a,b)=>a*new Rational(b,a).n,BigInt(1));expect(lcd<=BigInt(30)).toBe(true);
    }
    expect(VariantRules.parse({...rules,max_lcd:undefined}).max_lcd).toBe(60);
  });
  it('혼합 정수 계산의 나눗셈은 나누어떨어지는 쌍으로 20개 생성한다',()=>{
    const template=templatize('(-4)×3-(-6)÷2','number',rules),rows=generateVariants(template,20,seededRandom());expect(validateStoredVariants(rows)).toEqual(rows);
    for(const row of rows){const m=row.stem_md.match(/\(-([0-9]+)\)÷([0-9]+)/)!;expect(Number(m[1])%Number(m[2])).toBe(0);expect(row.answer_spec.type==='number'&&Rational.parse(row.answer_spec.value).d===BigInt(1)).toBe(true);}
  });
  it.each([true, false])('두 구간 대입 변형 20개: 서식·역할·정수해 유지 (keep_sign=%s)', keepSign => {
    const stem = '문제. $x=-2$일 때, 다음 식의 값을 구하시오.\n\n$3x+5$';
    const template = templatize(stem, 'number', { ...rules, keep_sign: keepSign });
    expect(template.pattern).toBe('문제. $x={p0}$일 때, 다음 식의 값을 구하시오.\n\n${p1}x+{p2}$');
    expect(template.params.values.map(value => value.role)).toEqual(['number', 'coefficient', 'number']);
    expect(template.params.values[0]).toMatchObject({ original: '-2', range: rules.integer_range });
    expect(template.params.values[1].range).toEqual(rules.coefficient_range);
    const variants = generateVariants(template, 20, seededRandom());
    expect(variants).toHaveLength(20);
    expect(new Set(variants.map(row => row.stem_md)).size).toBe(20);
    expect(validateStoredVariants(variants)).toEqual(variants);
    const assignments: number[] = [];
    for (const variant of variants) {
      const match = variant.stem_md.match(/^문제\. \$x=(-?\d+)\$일 때, 다음 식의 값을 구하시오\.\n\n\$(-?\d+)x\+(-?\d+)\$$/)!;
      expect(match).not.toBeNull();
      const value = Number(match[1]), coefficient = Number(match[2]);
      assignments.push(value);
      expect(Math.abs(value)).toBeGreaterThanOrEqual(rules.integer_range[0]);
      expect(Math.abs(value)).toBeLessThanOrEqual(rules.integer_range[1]);
      expect(Math.abs(coefficient)).toBeGreaterThanOrEqual(2);
      expect(Math.abs(coefficient)).toBeLessThanOrEqual(rules.coefficient_range[1]);
      if (variant.answer_spec.type !== 'number') throw new Error('Expected number');
      expect(variant.answer_spec.value).toBe(String(value * coefficient + Number(match[3])));
      expect(Rational.parse(variant.answer_spec.value).d).toBe(BigInt(1));
    }
    if (keepSign) expect(assignments.every(value => value < 0)).toBe(true);
    else { expect(assignments.some(value => value > 0)).toBe(true); expect(assignments.some(value => value < 0)).toBe(true); }
  });
  it('수학 구간 밖 번호는 보존한다', () => {
    expect(templatize('문제 7. $x=-2$일 때 $3x+5$', 'number', rules).pattern).toBe('문제 7. $x={p0}$일 때 ${p1}x+{p2}$');
  });
  it('dfrac 변수 분자는 유지하고 서로 다른 분모·정수해 변형 20개를 생성한다', () => {
    const template = templatize('$\\dfrac{x}{2}+\\dfrac{x}{3}=5$', 'number', rules);
    expect(template.params.values.map(value => value.role)).toEqual(['denominator', 'denominator', 'number']);
    const variants = generateVariants(template, 20, seededRandom());
    expect(new Set(variants.map(row => row.stem_md)).size).toBe(20);
    expect(validateStoredVariants(variants)).toEqual(variants);
    for (const variant of variants) {
      const denominators = [...variant.stem_md.matchAll(/\\dfrac\{x\}\{(\d+)\}/g)].map(match => match[1]);
      expect(denominators).toHaveLength(2);
      expect(new Set(denominators).size).toBe(2);
      expect(variant.answer_spec.type).toBe('number');
      if (variant.answer_spec.type === 'number') expect(Rational.parse(variant.answer_spec.value).d).toBe(BigInt(1));
    }
    expect(templatize('x/2+x/3=5', 'number', rules).params.values.map(value => value.role)).toEqual(['denominator', 'denominator', 'number']);
  });
  it.each(['1/2 + 1/3', '2x+10=4', '3x-3>=4(x+3)-8'])('%s: n=5·20 각각 30회 모두 성공', stem => {
    expect(rules.reduced_retry).toBe(200);
    const type = stem.includes('/') ? 'fraction' : 'number';
    const template = templatize(`다음 문제를 푸시오. $${stem}$`, type, rules);
    for (const count of [5, 20]) {
      for (let trial = 0; trial < 30; trial++) {
        // Use the production random source; do not replay the same seeded sequence.
        const variants = generateVariants(template, count);
        expect(variants).toHaveLength(count);
        expect(new Set(variants.map(row => row.stem_md)).size).toBe(count);
        expect(validateStoredVariants(variants)).toEqual(variants);
      }
    }
  });
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
  it('분수 대입값 변형은 지원 밖으로 두고 음의 정수 대입값은 매핑한다', () => {
    expect(() => templatize('x=1/2; x+3', 'fraction', rules)).toThrow(UnsupportedError);
    expect(templatize('x=-2; x+3', 'number', rules).pattern).toBe('x={p0}; x+{p1}');
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

it.each(['다음을 계산하시오. $2/3 ÷ 3/4$',String.raw`다음을 계산하시오. $\frac{2}{3}\div\frac{3}{4}$`])('단순 분수 나눗셈 %s는 기약 진분수로 변형한다', stem => {
  const template=templatize(stem,'fraction',{...rules,numerator_range:[2,7],max_lcd:30});
  expect(template.params.values.map(p=>p.role)).toEqual(['numerator','denominator','numerator','denominator']);
  const rows=generateVariants(template,20,seededRandom());expect(validateStoredVariants(rows)).toEqual(rows);
  for(const row of rows){const nums=row.stem_md.match(/\d+/g)!.map(Number);for(const [n,d] of [[nums[0],nums[1]],[nums[2],nums[3]]]){expect(n).toBeGreaterThanOrEqual(2);expect(n).toBeLessThanOrEqual(7);expect(n).toBeLessThan(d);expect(new Rational(n,d).d).toBe(BigInt(d));}expect(row.answer_spec.type==='fraction'&&Rational.parse(row.answer_spec.value).d<=BigInt(30)).toBe(true);}
});
