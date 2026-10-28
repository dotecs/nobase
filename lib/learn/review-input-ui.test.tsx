import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnswerInput,eraseAnswer } from '@/components/learn/AnswerInput';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
import { ReviewPanel } from '@/app/(main)/learn/review/ReviewPanel';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('@/app/(main)/learn/actions',()=>({startReview:vi.fn()}));
describe('review and mobile inputs',()=>{
  it('keypad provides backspace that deletes one character or selected text',()=>{expect(renderToStaticMarkup(<AnswerInput type="number" value="123" onChange={()=>{}}/>)).toContain('⌫');expect(eraseAnswer('123',3,3)).toEqual({text:'12',cursor:2});expect(eraseAnswer('123',1,2)).toEqual({text:'13',cursor:1});expect(eraseAnswer('123',0,0).text).toBe('123');});
  it('photo picker is hidden and associated with its label',()=>{const html=renderToStaticMarkup(<PhotoCapture userId="test" required onChange={()=>{}}/>);expect(html).toMatch(/<input[^>]*hidden=""[^>]*type="file"/);expect(html).toContain('사진 찍기 / 올리기');expect(html).toContain('capture="environment"');expect(html).toContain('<label for=');});
  it('inequality choices have four buttons',()=>{const html=renderToStaticMarkup(<AnswerInput type="number" relation_required variable="x" value="x<=3" onChange={()=>{}}/>);expect(html.match(/aria-pressed=/g)).toHaveLength(4);expect(html).toContain('부등호를 고르세요');});
  it.each([false,true])('review list populated=%s shows names only',populated=>{const html=renderToStaticMarkup(<ReviewPanel due={populated?[{id:'01-1',name:'정수의 덧셈'}]:[]}/>);expect(html).toContain(populated?'정수의 덧셈':'오늘은 복습이 없어요');expect(html).not.toContain('01-1');expect(html).toContain(populated?'복습 시작':'학습 홈으로');});
});
