
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { StepInput, appendStep, nonemptySteps } from '@/components/learn/StepInput';
import { Keypad,keypadKeys } from '@/components/learn/Keypad';
import { submissionHelp } from '@/components/learn/submission-help';

describe('solution step input',()=>{
  it('starts collapsed without input rows',()=>{
    const html=renderToStaticMarkup(<StepInput value={[]} onChange={()=>{}} onCopy={()=>{}}/>);
    expect(html).toContain('풀이 과정 적기 ▸');expect(html).toContain('aria-expanded="false"');expect(html).not.toContain('<input');
  });
  it('shares three keypad pages with variables and relations',()=>{const html=renderToStaticMarkup(<Keypad onKey={()=>{}}/>);for(const label of ['숫자','기호','함수'])expect(html).toContain(label);for(const key of ['x','(',')','=','≤','≥','^'])expect(keypadKeys(1)).toContain(key);});
  it('does not add a thirteenth row',()=>{
    expect(appendStep(Array(11).fill('x')).length).toBe(12);
    expect(appendStep(Array(12).fill('x')).length).toBe(12);
  });
  it('omits blank rows and requires a final answer even with steps',()=>{
    expect(nonemptySteps(['','  ','x=3','3'])).toEqual(['x=3','3']);
    expect(submissionHelp('number','',false,null,['x=3'])).toBe('마지막 답을 답 입력에 적어 주세요');
    expect(submissionHelp('number','3',true,null,['x=3'])).toBe('풀이 사진을 올리면 제출할 수 있어요');
  });
});
