import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DiagnosticNotice,DiagnosticFinish } from '@/app/(main)/learn/diagnostic/DiagnosticState';
import { submissionHelp } from '@/components/learn/submission-help';
describe('diagnostic guidance',()=>{
  it('shows the notice only before the first submission',()=>{expect(renderToStaticMarkup(<DiagnosticNotice planIndex={0}/>)).toContain('정답은 진단이 끝난 뒤');expect(renderToStaticMarkup(<DiagnosticNotice planIndex={1}/>)).toBe('');});
  it('finishes without exposing correctness and returns home',()=>{const html=renderToStaticMarkup(<DiagnosticFinish complete/>);expect(html).toContain('진단을 마쳤어요');expect(html).toContain('코치가 확인하면');expect(html).toContain('href="/learn"');expect(html).not.toContain('정답:');});
  it('guides an unstarted diagnostic back home',()=>{expect(renderToStaticMarkup(<DiagnosticFinish complete={false}/>)).toContain('학습 홈에서 진단을 시작해 주세요');});
  it('requires an answer and a required photo, but photo-only answers need no text',()=>{expect(submissionHelp('number','',false,null)).toContain('답을 입력');expect(submissionHelp('number','1',true,null)).toContain('풀이 사진');expect(submissionHelp('photo','',true,'photo')).toBe('');});
});
