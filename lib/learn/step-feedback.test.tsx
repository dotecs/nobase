import { renderToStaticMarkup } from 'react-dom/server';
import { describe,expect,it } from 'vitest';
import { FeedbackPanel } from '@/components/learn/FeedbackPanel';
import { AttemptSteps } from '@/components/learn/AttemptSteps';
import type { Feedback } from './learning-session';
import { checkSteps } from './mathcheck/steps';
const base:Feedback={type:'feedback',plan_index:0,result:'correct_independent',can_retry:false,hint:null,answer:null,explanation:null};
describe('step feedback',()=>{
  it('all valid lines show the checked count',()=>{
    const html=renderToStaticMarkup(<FeedbackPanel feedback={{...base,step_check:checkSteps('2x+10=4','number',['2x=-6','x=-3'])}}/>);
    expect(html).toContain('풀이 2줄 모두 맞아요');
  });
  it('wrong answer identifies the first wrong line and only echoes learner input',()=>{
    const html=renderToStaticMarkup(<FeedbackPanel feedback={{...base,result:'incorrect',step_check:checkSteps('2x+10=4','number',['2x=-6','x=3'])}}/>);
    expect(html).toContain('풀이 2번째 줄부터 다시 확인해 보세요');expect(html).toContain('x=3');expect(html).not.toContain('x=-3');
  });
  it('correct final answer keeps its title and uses a neutral step reminder',()=>{
    const html=renderToStaticMarkup(<FeedbackPanel feedback={{...base,step_check:checkSteps('2x+10=4','number',['2x=-6','x=3','x=-3'])}}/>);
    expect(html).toContain('정답이에요');expect(html).toContain('풀이 2번째 줄은 다시 봐 두세요');expect(html).not.toContain('warning');expect(html).toContain('caption');
  });
  it('coach timeline renders stored steps with ok, error and unparsed marks',()=>{
    const steps=['2x=-6','x=3','???'];
    const html=renderToStaticMarkup(<AttemptSteps steps={steps} autoGrade={{step_check:checkSteps('2x+10=4','number',steps)}}/>);
    for(const value of ['✓','✗','–','2x=-6','x=3','???'])expect(html).toContain(value);
    expect(renderToStaticMarkup(<AttemptSteps autoGrade={{}}/>)).toBe('');
  });
  it('unparsed lines never produce an all-correct claim',()=>{
    const html=renderToStaticMarkup(<FeedbackPanel feedback={{...base,step_check:checkSteps('1+1','number',['???','2'])}}/>);
    expect(html).not.toContain('모두 맞아요');
  });
});
