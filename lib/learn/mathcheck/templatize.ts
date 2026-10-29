import { z } from 'zod';
import { AnswerSpec } from '../answer-spec';
import type { AnswerType } from '../types';
import { parseMath, UnsupportedError, type Expr } from './parse';
import { normalizeStem, solveItem } from './solve';
import { Rational } from './rational';
import { polynomial, equivalent } from './evaluate';
import { hasNumericInstruction,hasFunctionNotation } from './template-lock';

export const VariantRules = z.object({
  count_default: z.number().int().min(3).max(5),
  denominator_range: z.tuple([z.number().int().positive(), z.number().int().positive()]).refine(([min, max]) => min <= max && max <= 10000, '잘못된 분모 범위'),
  integer_range: z.tuple([z.number().int().positive(), z.number().int().positive()]).refine(([min, max]) => min <= max && max <= 10000),
  numerator_range: z.tuple([z.number().int().positive(), z.number().int().positive()]).refine(([min, max]) => min <= max && max <= 10000).optional(),
  coefficient_range: z.tuple([z.number().int().min(2), z.number().int().min(2)]).refine(([min, max]) => min <= max && max <= 10000),
  exclude_zero_answer: z.boolean(),
  max_lcd: z.number().int().positive().default(60),
  operand_fractions: z.literal('proper_reduced'), answer_shape: z.literal('same_as_seed'), max_answer_abs: z.number().int().positive(),
  distinct_denominators: z.boolean(), keep_sign: z.boolean(), reduced_retry: z.number().int().positive().max(1000),
  usage_split: z.object({ practice: z.number().int().nonnegative(), review: z.number().int().nonnegative() }).strict(),
}).strict();
const Parameter = z.object({ name: z.string(), original: z.string(), range: z.tuple([z.number(), z.number()]), role: z.enum(['number', 'numerator', 'denominator', 'dividend', 'divisor', 'coefficient', 'exponent']) });
export const TemplateSchema = z.object({
  pattern: z.string(), solver: z.literal('solveItem'),
  params: z.object({ source_stem: z.string(), answer_type: z.enum(['number', 'fraction', 'expression']), rules: VariantRules, values: z.array(Parameter), reduce_fraction: z.boolean().default(false), factor_expression: z.boolean().default(false), locked: z.boolean().optional() }),
});
export type ItemTemplate = z.infer<typeof TemplateSchema>;
export const DraftVariants = z.array(z.object({ enabled: z.boolean(), stem_md: z.string().min(1), answer_type: z.enum(['number', 'fraction', 'expression']), answer_spec: AnswerSpec, usage: z.enum(['practice', 'review', 'assessment']) }).strict());
export type DraftVariant = z.infer<typeof DraftVariants>[number];

export function templatize(stem: string, answerType: AnswerType, config: unknown, answerSpec?: unknown): ItemTemplate {
  const rules = VariantRules.parse(config);
  if(hasFunctionNotation(stem)||hasNumericInstruction(stem))return TemplateSchema.parse({pattern:stem,solver:'solveItem',params:{source_stem:stem,answer_type:answerType,rules,values:[],locked:true}});
  if (!solveItem(stem, answerType).ok || !['number', 'fraction', 'expression'].includes(answerType)) throw new Error('프로그램 검증에 성공한 문제만 변형할 수 있습니다.');
  const values: ItemTemplate['params']['values'] = [];
  let integerDivision = false;
  const literal = (expr: Expr): boolean => expr.kind === 'number' || expr.kind === 'neg' && expr.value.kind === 'number';
  const simpleFraction = (expr: Expr): boolean => expr.kind === 'binary' && expr.op === '/' && literal(expr.left) && literal(expr.right);
  const parameter = (value: Rational, role: z.infer<typeof Parameter>['role'] = 'number') => {
    const magnitude = Math.abs(Number(value.n) / Number(value.d));
    if (!Number.isSafeInteger(Math.ceil(magnitude))) throw new Error('변형 범위를 벗어난 수입니다.');
    const range: [number, number] = role === 'denominator' ? [...rules.denominator_range] : role === 'numerator' ? [...(rules.numerator_range ?? rules.integer_range)] : role === 'coefficient' ? [...rules.coefficient_range] : role === 'exponent' ? [magnitude, magnitude] : [...rules.integer_range];
    const name = `p${values.length}`;
    values.push({ name, original: value.toString(), role, range });
    return `{${name}}`;
  };
  const walk = (expr: Expr, role: z.infer<typeof Parameter>['role'] = 'number'): string => {
    if (expr.kind === 'number') return parameter(expr.value, role);
    if (expr.kind === 'variable') return expr.name;
    if (expr.kind === 'neg') return `(-${walk(expr.value, role)})`;
  if (expr.kind === 'call' || expr.kind === 'constant') throw new UnsupportedError('Functions and constants require numeric evaluation');
    if (expr.op === '/' && simpleFraction(expr.left) && simpleFraction(expr.right)) return `(${walk(expr.left)}/${walk(expr.right)})`;
    if ((expr.op === '/' || expr.op === '^') && expr.right.kind !== 'number' && !(expr.right.kind === 'neg' && expr.right.value.kind === 'number')) throw new Error('복합 분모·지수의 변형은 지원하지 않습니다.');
    if (expr.op === '/' && !['number', 'variable'].includes(expr.left.kind) && !(expr.left.kind === 'neg' && ['number', 'variable'].includes(expr.left.value.kind))) throw new UnsupportedError('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
    return `(${walk(expr.left, expr.op === '/' ? integerDivision ? 'dividend' : 'numerator' : expr.op === '*' && expr.right.kind !== 'number' ? 'coefficient' : 'number')}${expr.op}${walk(expr.right, expr.op === '/' ? integerDivision ? 'divisor' : 'denominator' : expr.op === '^' ? 'exponent' : 'number')})`;
  };
  let text = normalizeStem(stem);
  const assignment = text.match(/^([a-z])\s*=\s*([+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+)?)\s*(?:;|일\s*때,?)\s*(.+)$/);
  if (assignment) {
    const value = Rational.parse(assignment[2]);
    if (value.d !== BigInt(1)) throw new UnsupportedError('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
    parameter(value, 'number'); text = assignment[3];
  }
  const parsed = parseMath(text);
  const seedAnswer=solveItem(stem,answerType);
  if(seedAnswer.ok&&seedAnswer.answer_spec.type==='expression'&&seedAnswer.answer_spec.factored_required){
    const p=polynomial(parsed.left),[b,a]=p.coefficients;
    parameter(a,'coefficient');parameter(b,'number');
    const expression=`{p0}${p.variable}+{p1}`;
    const regions=[...stem.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]*?)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)];
    const target=regions.find(r=>normalizeStem(r[0])===text);
    const pattern=target?stem.slice(0,target.index)+target[0].replace(target.slice(1).find(v=>v!==undefined)!,expression)+stem.slice(target.index!+target[0].length):expression;
    return TemplateSchema.parse({pattern,params:{source_stem:stem,answer_type:answerType,rules,values,factor_expression:true},solver:'solveItem'});
  }
  const hasVariable = (expr: Expr): boolean => expr.kind === 'variable' || (expr.kind === 'neg' ? hasVariable(expr.value) : expr.kind === 'binary' ? hasVariable(expr.left) || hasVariable(expr.right) : false);
  integerDivision = /÷|\\div/.test(stem) && !parsed.relation && !hasVariable(parsed.left) && answerType === 'number';
  walk(parsed.left);
  if (parsed.right) walk(parsed.right);
  if (!values.length) throw new Error('변형할 숫자가 없습니다.');
  let cursor = 0;
  const replaceNumbers = (text: string): string => {
    if (assignment && cursor === 0) {
      const prefix = text.match(/^((?:\$\$?|\\\(|\\\[)?\s*[a-z]\s*=\s*)([+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+)?)/);
      if (!prefix || Rational.parse(prefix[2]).compare(Rational.parse(values[0].original)) !== 0) throw new UnsupportedError('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
      cursor++;
      return prefix[1] + `{${values[0].name}}` + replaceNumbers(text.slice(prefix[0].length));
    }
    return text.replace(/\d+(?:\.\d+)?/g, (literal, index: number) => {
    const param = values[cursor++];
    if (!param || Rational.parse(literal).compare(Rational.parse(param.original)) !== 0) throw new UnsupportedError('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
    if (param.role === 'number' && /^\s*(?:\\left\s*)?\(/.test(text.slice(index + literal.length))) { param.role = 'coefficient'; param.range = [...rules.coefficient_range]; }
    return `{${param.name}}`;
    });
  };
  const regions = [...stem.matchAll(/\$\$[\s\S]*?\$\$|\$[^$]*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g)];
  let offset = 0;
  const pattern = regions.length ? regions.map(region => {
    const part = stem.slice(offset, region.index) + replaceNumbers(region[0]);
    offset = region.index! + region[0].length;
    return part;
  }).join('') + stem.slice(offset) : replaceNumbers(stem);
  if (cursor !== values.length) throw new UnsupportedError('이 문항은 서식이 복잡해 자동 변형이 안 됩니다');
  const solved = solveItem(stem, answerType);
  const answer = AnswerSpec.parse(answerSpec ?? (solved.ok ? solved.answer_spec : null));
  const reduce_fraction = answer.type === 'fraction' && answer.require_reduced && !assignment && !parsed.relation &&
    parsed.left.kind === 'binary' && parsed.left.op === '/' && values.length === 2 &&
    values[0].role === 'numerator' && values[1].role === 'denominator';
  return TemplateSchema.parse({ pattern, params: { source_stem: stem, answer_type: answerType, rules, values, reduce_fraction }, solver: 'solveItem' });
}

function render(template: ItemTemplate, values: string[]) {
  return template.pattern.replace(/\{p(\d+)\}/g, (_, index: string) => values[Number(index)]);
}

export function generateVariants(input: ItemTemplate, count: number, random: () => number = Math.random): DraftVariant[] {
  const template = TemplateSchema.parse(input), { rules, values, answer_type } = template.params;
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error('잘못된 변형 개수');
  if(template.params.locked)return [];
  const seen = new Set([render(template, values.map(value => value.original))]);
  const seed = solveItem(template.params.source_stem, answer_type);
  if (!seed.ok) throw new UnsupportedError('씨앗 정답 검증 실패');
  const reducedAnswers = new Set(seed.answer_spec.type === 'fraction' ? [seed.answer_spec.value] : []);
  const fractionDivision = /÷|\\div/.test(template.params.source_stem) && values.filter(value => value.role === 'denominator').length === 2;
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
      if(template.params.factor_expression){
        const a=BigInt(sampled[0]),b=BigInt(sampled[1]);
        if(new Rational(a,b).d!==(b<BigInt(0)?-b:b))continue;
        const k=BigInt(2+Math.floor(random()*5));sampled[0]=String(a*k);sampled[1]=String(b*k);
      }
      // Integer division uses exact pairs, independently of proper-fraction operands.
      for (let i = 0; i < values.length; i++) {
        if (values[i].role !== 'dividend' || values[i + 1]?.role !== 'divisor') continue;
        const divisor = Math.abs(Number(sampled[i + 1])), [min, max] = values[i].range;
        const first = Math.ceil(min / divisor), last = Math.floor(max / divisor);
        sampled[i] = first <= last ? String((first + Math.floor(random() * (last - first + 1))) * divisor * (Number(sampled[i]) < 0 ? -1 : 1)) : '0';
      }
      if (values.some((parameter, i) => parameter.role === 'dividend' && sampled[i] === '0')) continue;
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
      const lcd = denominators.reduce((multiple, denominator) => multiple * new Rational(denominator, multiple).n, BigInt(1));
      if (lcd > BigInt(rules.max_lcd)) continue;
      if (template.params.reduce_fraction) {
        const reduced = new Rational(Number(sampled[0]), Number(sampled[1])).toString();
        if (reducedAnswers.has(reduced)) continue;
        const factor = 2 + Math.floor(random() * 5);
        sampled[0] = String(Number(sampled[0]) * factor);
        sampled[1] = String(Number(sampled[1]) * factor);
      }
      const stem_md = template.params.factor_expression ? render(template,sampled).replace(/\+-/g,'-') : render(template, sampled);
      if (seen.has(stem_md)) continue;
      const result = solveItem(stem_md, answer_type);
      if (!result.ok) continue;
      if (fractionDivision && result.answer_spec.type === 'fraction' && Rational.parse(result.answer_spec.value).d > BigInt(rules.max_lcd)) continue;
      if (template.params.reduce_fraction && result.answer_spec.type === 'fraction' && reducedAnswers.has(result.answer_spec.value)) continue;
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
      if (template.params.reduce_fraction && result.answer_spec.type === 'fraction') reducedAnswers.add(result.answer_spec.value);
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
    if(result.ok&&result.answer_spec.type==='expression'&&variant.answer_spec.type==='expression'&&variant.answer_spec.factored_required===undefined&&equivalent(parseMath(result.answer_spec.value).left,parseMath(variant.answer_spec.value).left))continue;
    if (!result.ok || JSON.stringify(result.answer_spec) !== JSON.stringify(variant.answer_spec)) throw new Error('변형 정답 검증 실패');
  }
  return variants;
}
