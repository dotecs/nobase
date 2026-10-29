import type { AnswerType } from '../types';
import { equivalent,equivalentWithMethod } from './evaluate';
import { parseMath } from './parse';
import { normalizeStem, solveItem } from './solve';

export type StepCheck = { checked: number; first_error_index: number | null; lines: { input: string; status: 'ok' | 'error' | 'unparsed';method?:'numeric' }[] };

/** Advisory only: never changes the final-answer grade. */
export function checkSteps(stem: string, answerType: AnswerType, steps: string[]): StepCheck {
  const result: StepCheck = { checked: 0, first_error_index: null, lines: [] };
  const seed = solveItem(stem, answerType);
  let previous = seed, previousInput=stem;
  for (const input of steps.slice(0, 12)) {
    let status: StepCheck['lines'][number]['status'] = 'unparsed';let method:'numeric'|undefined;
    try {
      if (input.length > 200) throw new Error('Line too long');
      const text = normalizeStem(input).replace(/\s/g, '');
      let current = solveItem(text, answerType);
      // A bare final value is meaningful for an equation, but not an inequality.
      if (seed.ok && seed.answer_spec.type === 'number' && seed.answer_spec.variable && seed.answer_spec.relation === '=' && current.ok && current.answer_spec.type === 'number' && !current.answer_spec.variable) {
        current = solveItem(`${seed.answer_spec.variable}=${text}`, 'number');
      }
      if (previous.ok && current.ok) {
        const a = previous.answer_spec, b = current.answer_spec;
        let same = false;
        if (a.type === 'expression' && b.type === 'expression') same = equivalent(parseMath(a.value).left, parseMath(b.value).left);
        else if ((a.type === 'number' || a.type === 'fraction') && (b.type === 'number' || b.type === 'fraction')) {
          same = a.value === b.value && (a.type === 'number' ? a.variable : undefined) === (b.type === 'number' ? b.variable : undefined) && (a.type === 'number' ? a.relation : undefined) === (b.type === 'number' ? b.relation : undefined);
        }
        status = same ? 'ok' : 'error';
        result.checked++;
        if (!same && result.first_error_index === null) result.first_error_index = result.lines.length;
        previous = current;previousInput=text;
      }else if((!previous.ok&&previous.reason==='unsupported')||(!current.ok&&current.reason==='unsupported')){
        const a=parseMath(normalizeStem(previousInput)),b=parseMath(text);if(a.relation||b.relation)throw new Error('Unsupported relation step');
        const compared=equivalentWithMethod(a.left,b.left);status=compared.equal?'ok':'error';if(compared.method==='numeric')method='numeric';result.checked++;if(!compared.equal&&result.first_error_index===null)result.first_error_index=result.lines.length;previous=current;previousInput=text;
      }
    } catch { /* An unparsed line leaves the previous comparison intact. */ }
    result.lines.push({ input, status,...(method?{method}:{}) });
  }
  return result;
}
