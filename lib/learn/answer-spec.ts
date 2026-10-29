import { parseMath } from './mathcheck/parse';
import { constantValue } from './mathcheck/evaluate';
import { z } from 'zod';

const rational = z.string().regex(/^[+-]?(?:\d+(?:\.\d+)?|\d+\/[+-]?\d+)$/, '유리수 문자열이어야 합니다').refine(value => !value.includes('/') || BigInt(value.split('/')[1]) !== BigInt(0), '분모는 0일 수 없습니다');
// 2026-10-29 approved exception: number/fraction strings also accept constant expressions.
const constantMath = rational.or(z.string().min(1).max(4000).refine(value=>{try{const parsed=parseMath(value);return !parsed.relation&&Number.isFinite(constantValue(parsed.left));}catch{return false;}},'변수 없는 유효한 상수식이어야 합니다'));
export const AnswerSpec = z.discriminatedUnion('type', [
  z.object({ type: z.literal('number'), value: constantMath, variable: z.string().optional(), relation: z.enum(['=', '<', '<=', '>', '>=']).default('='), tolerance: rational.optional() }).strict(),
  z.object({ type: z.literal('fraction'), value: constantMath, require_reduced: z.boolean().default(true) }).strict(),
  z.object({ type: z.literal('expression'), value: z.string().min(1), variables: z.array(z.string()).optional(), factored_required: z.boolean().optional() }).strict(),
  z.object({ type: z.literal('choice'), options: z.array(z.object({ id: z.string().min(1), text_md: z.string(), misconception_id: z.string().optional() }).strict()).min(1), correct: z.array(z.string()).min(1), shuffle: z.boolean().optional() }).strict(),
  z.object({ type: z.literal('photo'), model_answer_md: z.string().optional() }).strict(),
  z.object({ type: z.literal('text'), model_answer_md: z.string(), keywords: z.array(z.string()).optional() }).strict(),
]);
export type AnswerSpecValue = z.infer<typeof AnswerSpec>;
