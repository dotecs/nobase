import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FeedbackPanel } from '@/components/learn/FeedbackPanel';
import { SessionComplete } from '@/app/(main)/learn/session/[id]/SessionComplete';
import type { Feedback } from './learning-session';
const base:Feedback={type:'feedback',plan_index:0,result:'correct_independent',can_retry:false,hint:null,answer:null,explanation:null};
describe('session feedback',()=>{
  it.each([['correct_independent',false,'정답이에요'],['correct_assisted',false,'도움을 받아 맞혔어요'],['incorrect',true,'한 번 더 풀 수 있어요'],['incorrect',false,'정답:'],['pending_review',false,'코치가 풀이를 확인해요']] as const)('%s retry=%s',(result,can_retry,label)=>{const f={...base,result,can_retry,...(result==='incorrect'&&!can_retry?{answer:'$2/3$',explanation:'분모를 맞춰 더해요'}:{})};const html=renderToStaticMarkup(<FeedbackPanel feedback={f}/>);expect(html).toContain('role="status"');expect(html).toContain('이전 문항');expect(html).toContain(label);if(f.explanation)expect(html).toContain(f.explanation);});
  it.each([false,true])('completion timed_out=%s',timed_out=>{const html=renderToStaticMarkup(<SessionComplete summary={{correct:3,newly_verified:['01-1'],next_review_at:null,timed_out}} topicNames={['정수의 덧셈']} hasReview feedback={null}/>);expect(html).toContain(timed_out?'오늘은 여기까지':'학습을 마쳤어요');if(timed_out)expect(html).toContain('푼 만큼은 저장됐어요');expect(html).toContain('정수의 덧셈');expect(html).not.toContain('01-1');expect(html).toContain('예정 없음');expect(html).toContain('복습 하러 가기');});
});
