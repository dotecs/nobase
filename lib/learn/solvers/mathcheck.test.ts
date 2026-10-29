import { describe, expect, it, vi } from 'vitest';
vi.mock('next/headers', () => ({}));
import { getSolver } from './index';
import { gradeAttempt } from '../grade';
import type { AnswerSpecValue } from '../answer-spec';
const number: AnswerSpecValue = { type: 'number', value: '-3', relation: '=' };
const fraction: AnswerSpecValue = { type: 'fraction', value: '3/4', require_reduced: true };
const equation: AnswerSpecValue = { type: 'number', variable: 'x', value: '-3', relation: '=' };
const inequality: AnswerSpecValue = { ...equation, relation: '<=' };
const expression: AnswerSpecValue = { type: 'expression', value: '-12x+21' };
describe('mathcheck grading', () => {
  it.each([
    [number, '-3', 'correct'], [number, '−３', 'correct'], [number, ' - 3 ', 'correct'], [number,'3','incorrect'], [number,'','input_issue'], [number,'1/0','input_issue'],
    [fraction,'3/4','correct'],[fraction,'6/8','correct'],[fraction,'0.75','correct'],[fraction,'3/5','incorrect'],[fraction,'2//3','input_issue'],
    [equation,'-3','correct'],[equation,'x=-3','correct'],[equation,'２ｘ＝−６','correct'],[equation,'x=3','incorrect'],[equation,'y=-3','incorrect'],
    [inequality,'x<=-3','correct'],[inequality,'x≤−3','correct'],[inequality,'x>=-3','incorrect'],[inequality,'-3','input_issue'],[inequality,'x=-3','incorrect'],
    [expression,'3(7-4x)','correct'],[expression,'$-12x+21$','correct'],[expression,'21-12x','correct'],[expression,'-12x+20','incorrect'],[expression,'x=1','input_issue'],[expression,'sin(x)','incorrect'],
  ] as const)('grades %j / %s as %s', (spec,input,result) => expect(getSolver('mathcheck').grade(spec.type, spec, input).result).toBe(result));
  it('nonreduced answer is marked assisted and stamped with rule version', () => {
    const result = gradeAttempt({answer_type:'fraction',answer_spec:fraction},'6/8',0,'mathcheck',{ configs:{solvers:{default:'mathcheck',by_pack:{}}},rule_version:{solvers:1} });
    expect(result).toMatchObject({result:'correct_assisted',auto_grade:{normalized:'3/4',detail:{not_reduced:true}},rule_version:{solvers:1}});
  });
  it('reduced requirement can be disabled', () => expect(getSolver('mathcheck').grade('fraction',{...fraction,require_reduced:false},'6/8').detail.not_reduced).toBeUndefined());
  it('hint use makes a correct answer assisted', () => expect(gradeAttempt({answer_type:'number',answer_spec:number},'-3',1,'mathcheck',{configs:{solvers:{default:'mathcheck',by_pack:{}}},rule_version:{solvers:1}}).result).toBe('correct_assisted'));
  it('choice compares ID sets and rejects unknown IDs', () => {
    const spec: AnswerSpecValue = {type:'choice',options:[{id:'a',text_md:'A'},{id:'b',text_md:'B'}],correct:['a','b']};
    expect(getSolver('mathcheck').grade('choice',spec,['b','a']).result).toBe('correct');
    expect(getSolver('mathcheck').grade('choice',spec,['a']).result).toBe('incorrect');
    expect(getSolver('mathcheck').grade('choice',spec,['c']).result).toBe('input_issue');
    expect(getSolver('mathcheck').grade('choice',spec,['a','a']).result).toBe('input_issue');
  });
  it.each(['photo','text'] as const)('%s requires coach review', type => expect(getSolver('mathcheck').grade(type,{type,model_answer_md:'private answer'},'my explanation').result).toBe('pending_review'));
  it('unknown solver is never silently replaced', () => expect(() => getSolver('unknown')).toThrow('Unknown solver'));
  it('grading output never contains expected answer', () => expect(JSON.stringify(getSolver('mathcheck').grade('text',{type:'text',model_answer_md:'secret'},'my answer'))).not.toContain('secret'));
});

it('factoring rejects an unfactored copy but preserves legacy expression grading',()=>{
 const spec={type:'expression' as const,value:'3(2x+3)',factored_required:true};
 expect(getSolver('mathcheck').grade('expression',spec,'6x+9')).toMatchObject({result:'incorrect',detail:{reason:'not_factored'}});
 expect(getSolver('mathcheck').grade('expression',spec,'(6x+9)')).toMatchObject({result:'incorrect',detail:{reason:'not_factored'}});
 expect(getSolver('mathcheck').grade('expression',{type:'expression',value:'6x+9'},'6x+9')).toMatchObject({result:'correct'});
});
it('factoring accepts equivalent products in either order',()=>{
 for(const input of ['3(2x+3)','(2x+3)·3'])expect(getSolver('mathcheck').grade('expression',{type:'expression',value:'3(2x+3)',factored_required:true},input)).toMatchObject({result:'correct'});
});
