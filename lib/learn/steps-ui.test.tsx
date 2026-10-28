import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { StepInput, appendStep, nonemptySteps } from '@/components/learn/StepInput';
import { Keypad } from '@/components/learn/Keypad';
import { submissionHelp } from '@/components/learn/submission-help';
vi.mock('react',async original=>{const actual=await original<typeof React>();return {...actual,useState:vi.fn(actual.useState)};});

describe('solution step input',()=>{
  it('starts collapsed without input rows',()=>{
    const html=renderToStaticMarkup(<StepInput value={[]} onChange={()=>{}} onCopy={()=>{}}/>);
    expect(html).toContain('풀이 과정 적기 ▸');expect(html).toContain('aria-expanded="false"');expect(html).not.toContain('<input');
  });
  it('switches keypad to the second page with variables and relations',()=>{
    const setPage=vi.fn();vi.mocked(useState).mockImplementationOnce(()=>[0,setPage]);
    const tree=Keypad({extended:true,onKey:()=>{}});
    tree.props.children[0].props.children[1].props.onClick();expect(setPage).toHaveBeenCalledWith(1);
    vi.mocked(useState).mockImplementationOnce(()=>[1,setPage]);
    const html=renderToStaticMarkup(<Keypad extended onKey={()=>{}}/>);
    for(const key of ['x','(',')','=','≤','≥','^'])expect(html).toContain(`>${key}</button>`);
  });
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
