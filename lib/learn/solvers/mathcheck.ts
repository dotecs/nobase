import { AnswerSpec } from '../answer-spec';
import { Rational } from '../mathcheck/rational';
import { parseMath } from '../mathcheck/parse';
import { equivalent } from '../mathcheck/evaluate';
import { solveItem } from '../mathcheck/solve';
import { hasFactoredProduct } from '../mathcheck/factor';
import type { Grade, Solver } from './index';
function normalize(input: string) {
  return input.normalize('NFKC').replace(/[−–]/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=').trim().replace(/^\$\$?([\s\S]*?)\$\$?$/, '$1').replace(/^\\\(([\s\S]*)\\\)$/, '$1').replace(/\s/g, '');
}
const issue = (reason: string): Grade => ({ result: 'input_issue', normalized: null, detail: { reason } });
export const mathcheck: Solver = {
  grade(type, rawSpec, input) {
    const spec = AnswerSpec.parse(rawSpec);
    if (spec.type !== type) throw new Error('Item answer type mismatch');
    if (type === 'choice' && spec.type === 'choice') {
      if (!Array.isArray(input) || !input.length || input.some(id => typeof id !== 'string' || !spec.options.some(option => option.id === id)) || new Set(input).size !== input.length) return issue('invalid_choices');
      const selected = [...input].sort();
      return { result: JSON.stringify(selected) === JSON.stringify([...spec.correct].sort()) ? 'correct' : 'incorrect', normalized: selected, detail: {} };
    }
    if (typeof input !== 'string' || input.length > 4000) return issue('invalid_input');
    const text = normalize(input);
    if (type === 'photo' || type === 'text') return type === 'text' && !text ? issue('empty') : { result: 'pending_review', normalized: input.trim(), detail: { reason: 'coach_required' } };
    if (!text) return issue('empty');
    try {
      if (spec.type === 'expression') {
        const parsed = parseMath(text), expected = parseMath(spec.value);
        if (parsed.relation) return issue('expression_expected');
        if (spec.factored_required && (!text.includes('(') || !hasFactoredProduct(parsed.left))) return {result:'incorrect',normalized:text,detail:{reason:'not_factored'}};
        return { result: equivalent(parsed.left, expected.left) ? 'correct' : 'incorrect', normalized: text, detail: {} };
      }
      if (spec.type !== 'number' && spec.type !== 'fraction') return issue('unsupported');
      let valueText = text;
      if (spec.type === 'number' && spec.variable) {
        let relation = spec.relation;
        try { Rational.parse(text); if (relation !== '=') return issue('relation_required'); }
        catch {
          const solved = solveItem(text, 'number');
          if (!solved.ok || solved.answer_spec.type !== 'number' || !solved.answer_spec.variable) return issue('invalid_relation');
          relation = solved.answer_spec.relation; valueText = solved.answer_spec.value;
          if (solved.answer_spec.variable !== spec.variable || relation !== spec.relation) return { result: 'incorrect', normalized: text, detail: {} };
        }
      }
      const value = Rational.parse(valueText), expected = Rational.parse(spec.value);
      let correct = value.compare(expected) === 0;
      if (spec.type === 'number' && spec.tolerance) {
        const diff = value.sub(expected), tolerance = Rational.parse(spec.tolerance);
        correct = new Rational(diff.n < BigInt(0) ? -diff.n : diff.n, diff.d).compare(tolerance) <= 0;
      }
      const rawFraction = valueText.match(/^[+-]?\d+\/([+-]?\d+)$/);
      const denominator = rawFraction ? BigInt(rawFraction[1]) : null;
      const not_reduced = !!(spec.type === 'fraction' && spec.require_reduced && denominator !== null && (denominator < BigInt(0) ? -denominator : denominator) !== value.d);
      return { result: correct ? 'correct' : 'incorrect', normalized: value.toString(), detail: not_reduced ? { not_reduced: true } : {} };
    } catch { return issue('invalid_math'); }
  },
};
