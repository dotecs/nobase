import { AnswerSpec, type AnswerSpecValue } from '../answer-spec';
import type { AnswerType } from '../types';
import { parseMath, normalizeMath, UnsupportedError } from './parse';
import { evaluate, polynomial, formatPolynomial, solveRelation } from './evaluate';
import { Rational } from './rational';

export type SolveResult = { ok: true; answer_spec: AnswerSpecValue } | { ok: false; reason: 'unsupported' | 'parse_error' };
export function normalizeStem(stem: string) {
  const allRegions = [...stem.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]*?)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)];
  const substantive = allRegions.filter(region => !/^(?:[a-z]|[+-]?\s*\d+(?:\.\d+)?)$/.test(normalizeMath(region.slice(1).find(value => value !== undefined)!)));
  const regions = substantive.length ? substantive : allRegions;
  if (regions.length === 2) {
    const parts = regions.map(region => normalizeMath(region.slice(1).find(value => value !== undefined)!));
    const assignment = parts[0].match(/^([a-z])\s*=\s*(.+)$/);
    if (assignment && /^[+-]?\s*\(*\s*\d+(?:\.\d+)?\s*\)*(?:\s*\/\s*\(*\s*[+-]?\d+\s*\)*)?$/.test(assignment[2])) {
      const value = parseMath(assignment[2]);
      if (!value.relation && !polynomial(value.left, {}).variable) {
        return `${assignment[1]}=${evaluate(value.left, {}).toString()}; ${parts[1]}`;
      }
    }
  }
  if (regions.length > 1) throw new UnsupportedError('Multiple math regions');
  if (regions.length === 1) return normalizeMath(regions[0].slice(1).find(value => value !== undefined)!);
  let text = stem.trim().replace(/\$\$|\$|\\\(|\\\)|\\\[|\\\]/g, '');
  text = text.replace(/^(?:다음을 계산하시오[.:]?|다음 식을 정리하시오[.:]?)\s*/, '').replace(/\s*(?:을|를)?\s*(?:계산하시오|구하시오|풀어라|정리하시오)[.!]?$/, '').trim();
  return normalizeMath(text);
}
export function solveItem(stem: string, answerType: AnswerType): SolveResult {
  try {
    if (!['number', 'fraction', 'expression'].includes(answerType)) throw new UnsupportedError('Coach grading required');
    let text = normalizeStem(stem);
    const assignment = text.match(/^([a-z])\s*=\s*([+-]?\d+(?:\.\d+)?(?:\/[+-]?\d+)?)\s*(?:;|일\s*때,?)\s*(.+)$/);
    const values: Record<string, Rational> = {};
    if (assignment) { values[assignment[1]] = Rational.parse(assignment[2]); text = assignment[3]; }
    const parsed = parseMath(normalizeMath(text));
    let spec: unknown;
    if (parsed.relation) {
      if (answerType !== 'number' || assignment) throw new UnsupportedError('Relation requires number answer');
      spec = { type: 'number', ...solveRelation(parsed) };
    } else if (answerType === 'expression') {
      const p = polynomial(parsed.left, values);
      spec = { type: 'expression', value: formatPolynomial(p), variables: p.variable ? [p.variable] : [] };
    } else {
      spec = { type: answerType, value: evaluate(parsed.left, values).toString() };
    }
    return { ok: true, answer_spec: AnswerSpec.parse(spec) };
  } catch (error) { return { ok: false, reason: error instanceof UnsupportedError ? 'unsupported' : 'parse_error' }; }
}
