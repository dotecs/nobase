import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormattedMath } from '@/components/learn/FormattedMath';
import { FeedbackPanel } from '@/components/learn/FeedbackPanel';
import { AttemptSteps } from '@/components/learn/AttemptSteps';
import { MathPreview } from '@/components/learn/MathPreview';
import { inputIssueMessage } from './input-messages';
import type { Feedback } from './learning-session';
const feedback:Feedback={type:'feedback',plan_index:0,result:'pending_review',can_retry:false,hint:null,answer:null,explanation:null};
describe('consistent submitted math display',()=>{
 it('uses vertical fractions in submitted feedback',()=>{const html=renderToStaticMarkup(<FeedbackPanel feedback={{...feedback,input:'1/2x'}}/>);expect(html).toContain('입력:');expect(html).toContain('mfrac');expect(html).toContain('title="1/2x"');expect(html).not.toContain('입력 도움말');});
 it.each(['numeric_domain','coach_required'])('shows coach guidance for %s',reason=>{expect(renderToStaticMarkup(<FeedbackPanel feedback={{...feedback,reason}}/>)).toContain('코치가 확인한 뒤 알려드릴게요');});
 it('keeps historical feedback without optional input fields readable',()=>{const html=renderToStaticMarkup(<FeedbackPanel feedback={feedback}/>);expect(html).toContain('코치가 풀이를 확인해요');expect(html).not.toContain('입력:');});
 it('uses raw fallback without an interactive warning for readonly math',()=>{const html=renderToStaticMarkup(<MathPreview value="∫x" caption={false} help={false}/>);expect(html).toContain('<code');expect(html).toContain('∫x');expect(html).not.toContain('aria-live');});
 it('renders coach input from AST and preserves the exact original title',()=>{const html=renderToStaticMarkup(<FormattedMath value="x<=-7"/>);expect(html).toContain('≤');expect(html).toContain('title="x&lt;=-7"');expect(renderToStaticMarkup(<FormattedMath value="5/"/>)).toContain('<code>5/</code>');});
 it('uses the same AST formatting for coach steps',()=>{const html=renderToStaticMarkup(<AttemptSteps steps={['1/2x','sqrt(']} autoGrade={null}/>);expect(html).toContain('mfrac');expect(html).toContain('title="sqrt("');expect(html).toContain('<code>sqrt(</code>');});
 it('names the missing relation and unsupported input in Korean',()=>{expect(inputIssueMessage('relation_required')).toBe('부등호를 포함해 x ≤ … 형태로 적어 주세요');expect(inputIssueMessage('invalid_math')).toBe('아직 지원하지 않는 기호가 있어요. 입력 도움말을 확인해 주세요');expect(inputIssueMessage(undefined)).toBe('답 입력 형식을 확인해 주세요.');});
});
