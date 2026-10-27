import { z } from 'zod';
import { AnswerSpec } from '../answer-spec';
import type { AnswerType } from '../types';
import { parseMath, UnsupportedError, type Expr } from './parse';
import { normalizeStem, solveItem } from './solve';
import { Rational } from './rational';

export const VariantRules = z.object({
  count_default: z.number().int().min(3).max(5),
  denominator_range: z.tuple([z.number().int().positive(), z.number().int().positive()]).refine(([min, max]) => min <= max && max <= 10000, '잘못된 분모 범위'),
  integer_range: z.tuple([z.number().int().positive(), z.number().int().positive()]).refine(([min, max]) => min <= max && max <= 10000),
  coefficient_range: z.tuple([z.number().int().min(2), z.number().int().min(2)]).refine(([min, max]) => min <= max && max <= 10000),
  exclude_zero_answer: z.boolean(),
  operand_fractions: z.literal('proper_reduced'), answer_shape: z.literal('same_as_seed'), max_answer_abs: z.number().int().positive(),
  distinct_denominators: z.boolean(), keep_sign: z.boolean(), reduced_retry: z.number().int().positive().max(1000),
  usage_split: z.object({ practice: z.number().int().nonnegative(), review: z.number().int().nonnegative() }).strict(),
}).strict();
const Parameter = z.object({ name: z.string(), original: z.string(), range: z.tuple([z.number(), z.number()]), role: z.enum(['number', 'numerator', 'denominator', 'coefficient', 'exponent']) });
export const TemplateSchema = z.object({
  pattern: z.string(), solver: z.literal('solveItem'),
  params: z.object({ source_stem: z.string(), answer_type: z.enum(['number', 'fraction', 'expression']), rules: VariantRules, values: z.array(Parameter) }),
});
export type ItemTemplate = z.infer<typeof TemplateSchema>;
export const DraftVariants = z.array(z.object({ enabled: z.boolean(), stem_md: z.string().min(1), answer_type: z.enum(['number', 'fraction', 'expression']), answer_spec: AnswerSpec, usage: z.enum(['practice', 'review', 'assessment']) }).strict());
export type DraftVariant = z.infer<typeof DraftVariants>[number];

export function templatize(stem: string, answerType: AnswerType, config: unknown): ItemTemplate {
  const rules = VariantRules.parse(config);
  if (!solveItem(stem, answerType).ok || !['number', 'fraction', 'expression'].includes(answerType)) throw new Error('프로그램 검증에 성공한 문제만 변형할 수 있습니다.');
  const values: ItemTemplate['params']['values'] = [];
  const parameter = (value: Rational, role: z.infer<typeof Parameter>['role'] = 'number') => {
    const magnitude = Math.abs(Number(value.n) / Number(value.d));
    if (!Number.isSafeInteger(Math.ceil(magnitude))) throw new Error('변형 범위를 벗어난 수입니다.');
    const range: [number, number] = role === 'denominator' ? [...rules.denominator_range] : role === 'coefficient' ? [...rules.coefficient_range] : role === 'exponent' ? [magnitude, magnitude] : [...rules.integer_range];
    const name = `p${values.length}`;
    values.push({ name, original: value.toString(), role, range });
    return `{${name}}`;
  };
  const walk = (expr: Expr, role: z.infer<typeof Parameter>['role'] = 'number'): string => {
    if (expr.kind === 'number') return parameter(expr.value, role);
    if (expr.kind === 'variable') return expr.name;
    if (expr.kind === 'neg') return `(-${walk(expr.value, role)})`;
    if ((expr.op === '/' || expr.op === '^') && expr.right.kind !== 'number' && !(expr.right.kind === 'neg' && expr.right.value.kind === 'number')) throw new Error('복합 분모·지수의 변형은 지원하지 않습니다.');
    if (expr.op === '/' && !['number', 'variable'].includes(expr.left.kind) && !(expr.left.kind === 'neg' && ['number', 'variable'].includes(expr.left.value.kind))) throw new UnsupportedError('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
    return `(${walk(expr.left, expr.op === '/' ? 'numerator' : expr.op === '*' && expr.right.kind === 'variable' ? 'coefficient' : 'number')}${expr.op}${walk(expr.right, expr.op === '/' ? 'denominator' : expr.op === '^' ? 'exponent' : 'number')})`;
  };
  let text = normalizeStem(stem);
  const assignment = text.match(/^([a-z])\s*=\s*([+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+)?)\s*(?:;|일\s*때,?)\s*(.+)$/);
  if (assignment) { parameter(Rational.parse(assignment[2])); text = assignment[3]; }
  const parsed = parseMath(text);
  walk(parsed.left);
  if (parsed.right) walk(parsed.right);
  if (!values.length) throw new Error('변형할 숫자가 없습니다.');
  let cursor = 0;
  const replaceNumbers = (text: string) => text.replace(/\d+(?:\.\d+)?/g, literal => {
    const param = values[cursor++];
    if (!param || Rational.parse(literal).compare(Rational.parse(param.original)) !== 0) throw new UnsupportedError('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
    return `{${param.name}}`;
  });
  const regions = [...stem.matchAll(/\$\$[\s\S]*?\$\$|\$[^$]*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g)];
  const pattern = regions.length === 1 ? stem.slice(0, regions[0].index) + replaceNumbers(regions[0][0]) + stem.slice(regions[0].index! + regions[0][0].length) : replaceNumbers(stem);
  if (cursor !== values.length) throw new UnsupportedError('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
  return TemplateSchema.parse({ pattern, params: { source_stem: stem, answer_type: answerType, rules, values }, solver: 'solveItem' });
}

function render(template: ItemTemplate, values: string[]) {
  return template.pattern.replace(/\{p(\d+)\}/g, (_, index: string) => values[Number(index)]);
}

export function generateVariants(input: ItemTemplate, count: number, random: () => number = Math.random): DraftVariant[] {
  const template = TemplateSchema.parse(input), { rules, values, answer_type } = template.params;
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('잘못된 변형 개수');
  const seen = new Set([render(template, values.map(value => value.original))]);
  const seed = solveItem(template.params.source_stem, answer_type);
  if (!seed.ok) throw new UnsupportedError('씨앗 정답 검증 실패');
  const variants: DraftVariant[] = [];
  for (let index = 0; index < count; index++) {
    let found = false;
    for (let attempt = 0; attempt < rules.reduced_retry; attempt++) {
      const sampled = values.map(parameter => {
        const [min, max] = parameter.range;
        const value = min + Math.floor(random() * (max - min + 1));
        const negative = rules.keep_sign ? Rational.parse(parameter.original).n < BigInt(0) : parameter.role !== 'exponent' && random() < .5;
        return String(negative ? -value : value);
      });
      // Choose only proper, reduced operand pairs within the configured ranges.
      for (let i = 0; i < values.length; i++) {
        if (values[i].role !== 'numerator' || values[i + 1]?.role !== 'denominator') continue;
        const denominator = Math.abs(Number(sampled[i + 1]));
        const [min, max] = values[i].range;
        const candidates: number[] = [];
        for (let n = min; n <= max && n < denominator; n++) if (new Rational(n, denominator).d === BigInt(denominator)) candidates.push(n);
        sampled[i] = candidates.length ? String(candidates[Math.floor(random() * candidates.length)] * (Number(sampled[i]) < 0 ? -1 : 1)) : '0';
      }
      if (values.some((parameter, i) => parameter.role === 'numerator' && sampled[i] === '0')) continue;
      const denominators = values.flatMap((parameter, i) => parameter.role === 'denominator' ? [Math.abs(Number(sampled[i]))] : []);
      if (rules.distinct_denominators && new Set(denominators).size !== denominators.length) continue;
      const stem_md = render(template, sampled);
      if (seen.has(stem_md)) continue;
      const result = solveItem(stem_md, answer_type);
      if (!result.ok) continue;
      if ((result.answer_spec.type === 'number' || result.answer_spec.type === 'fraction') && (seed.answer_spec.type === 'number' || seed.answer_spec.type === 'fraction')) {
        const answer = Rational.parse(result.answer_spec.value), original = Rational.parse(seed.answer_spec.value);
        if (rules.exclude_zero_answer && original.n !== BigInt(0) && answer.n === BigInt(0)) continue;
        if ((answer.d === BigInt(1)) !== (original.d === BigInt(1))) continue;
        if ((answer.n < BigInt(0) ? -answer.n : answer.n) > BigInt(rules.max_answer_abs) * answer.d) continue;
      }
      // Rational solver output is reduced by construction; re-parse before accepting it.
      if (result.answer_spec.type === 'fraction' && Rational.parse(result.answer_spec.value).toString() !== result.answer_spec.value) continue;
      const usage = index < rules.usage_split.practice ? 'practice' : index < rules.usage_split.practice + rules.usage_split.review ? 'review' : 'assessment';
      variants.push({ enabled: true, stem_md, answer_type, answer_spec: result.answer_spec, usage });
      seen.add(stem_md); found = true; break;
    }
    if (!found) throw new Error(`재시도 한도 안에 ${count}개 변형을 만들지 못했습니다. 범위를 확인하거나 다시 생성해 주세요.`);
  }
  return variants;
}

export function validateStoredVariants(input: unknown): DraftVariant[] {
  const variants = DraftVariants.parse(input);
  for (const variant of variants) {
    const result = solveItem(variant.stem_md, variant.answer_type);
    if (!result.ok || JSON.stringify(result.answer_spec) !== JSON.stringify(variant.answer_spec)) throw new Error('변형 정답 검증 실패');
  }
  return variants;
}
