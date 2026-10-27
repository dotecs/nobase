import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect,vi } from 'vitest';
import { AnswerInput,composeRelationAnswer } from '@/components/learn/AnswerInput';
vi.mock('@/lib/math-markdown',()=>({renderMathMarkdown:(text:string)=>text}));
describe('inequality input',()=>{
  it('renders four unselected relation buttons and the variable prefix',()=>{const html=renderToStaticMarkup(<AnswerInput type="number" relation_required variable="x" value="" onChange={()=>{}}/>);expect(html.match(/aria-pressed="false"/g)).toHaveLength(4);for(const label of ['&lt;','≤','&gt;','≥'])expect(html).toContain(`>${label}</button>`);expect(html).toContain('aria-label="변수"> x');});
  it('renders no relation buttons for equations',()=>{const html=renderToStaticMarkup(<AnswerInput type="number" relation_required={false} variable="x" value="" onChange={()=>{}}/>);expect(html).not.toContain('aria-pressed');expect(html).not.toContain('부등호를 선택');});
  it('assembles the selected relation with an ASCII minus for submission',()=>{expect(composeRelationAnswer('x','<=','−7')).toBe('x<=-7');});
});
