import { AnswerSpec } from '../answer-spec';
import { Rational } from '../mathcheck/rational';
import { parseMath,UnsupportedError } from '../mathcheck/parse';
import { equivalent,constantValue,numericClose } from '../mathcheck/evaluate';
import { solveItem } from '../mathcheck/solve';
import { hasFactoredProduct } from '../mathcheck/factor';
import type { Grade, Solver } from './index';
function normalize(input: string) {
  return input.replace(/[−–]/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=').trim().replace(/^\$\$?([\s\S]*?)\$\$?$/, '$1').replace(/^\\\(([\s\S]*)\\\)$/, '$1');
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
      if(spec.type==='number'&&spec.variable){
        try{Rational.parse(text);if(spec.relation!=='=')return issue('relation_required');}
        catch{
          const parsed=parseMath(text);
          if(!parsed.relation){constantValue(parsed.left);if(spec.relation!=='=')return issue('relation_required');}
          else{
            const solved=solveItem(text,'number');
            if(solved.ok&&solved.answer_spec.type==='number'&&solved.answer_spec.variable){
              if(solved.answer_spec.variable!==spec.variable||solved.answer_spec.relation!==spec.relation)return {result:'incorrect',normalized:text,detail:{}};
              valueText=solved.answer_spec.value;
            }else if(parsed.left.kind==='variable'&&parsed.right){
              const value=constantValue(parsed.right);
              if(parsed.left.name!==spec.variable||parsed.relation!==spec.relation)return {result:'incorrect',normalized:text,detail:{}};
              valueText=String(value);
            }else return issue('invalid_relation');
          }
        }
      }
      const rationalText=/^[+-]?\s*\d+(?:\.\d+)?(?:\s*\/\s*[+-]?\s*\d+)?$/.test(valueText)?valueText.replace(/\s/g,''):valueText;
      if(/^[+-]?\d+\/[+-]?0+$/.test(rationalText))return issue('invalid_math');
      let value:Rational|undefined,expected:Rational|undefined;
      try{value=Rational.parse(rationalText);expected=Rational.parse(spec.value);}catch{/* Try the same AST as the preview. */}
      let correct:boolean,normalized:string;
      if(value&&expected){
        correct=value.compare(expected)===0;normalized=value.toString();
        if(spec.type==='number'&&spec.tolerance){const diff=value.sub(expected),tolerance=Rational.parse(spec.tolerance);correct=new Rational(diff.n<BigInt(0)?-diff.n:diff.n,diff.d).compare(tolerance)<=0;}
      }else{
        const a=parseMath(valueText),b=parseMath(spec.value);if(a.relation||b.relation)return issue('invalid_math');
        const actual=constantValue(a.left),target=constantValue(b.left),tolerance=spec.type==='number'&&spec.tolerance?Rational.parse(spec.tolerance):null;
        correct=numericClose(actual,target,tolerance?Number(tolerance.n)/Number(tolerance.d):undefined);normalized=String(actual);
      }
      const rawFraction=rationalText.match(/^[+-]?\d+\/([+-]?\d+)$/),denominator=rawFraction?BigInt(rawFraction[1]):null;
      const not_reduced=!!(spec.type==='fraction'&&spec.require_reduced&&denominator!==null&&value&&(denominator<BigInt(0)?-denominator:denominator)!==value.d);
      return {result:correct?'correct':'incorrect',normalized,detail:not_reduced?{not_reduced:true}:{}};
    }catch(error){if(error instanceof UnsupportedError&&error.message==='Numeric domain')return {result:'pending_review',normalized:text,detail:{reason:'numeric_domain'}};return issue('invalid_math');}

  },
};
