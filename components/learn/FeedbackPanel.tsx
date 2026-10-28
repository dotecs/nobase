import { StepFeedback } from './StepFeedback';
import type { Feedback } from '@/lib/learn/learning-session';
import { renderMathMarkdown } from '@/lib/math-markdown';
import styles from './feedback.module.css';
export function FeedbackPanel({feedback:f,currentPlanIndex}:{feedback:Feedback|null;currentPlanIndex?:number}) {
  if(!f)return null;
  const correct=f.result==='correct_independent'||f.result==='correct_assisted',pending=f.result==='pending_review';
  const tone=correct?(f.result==='correct_assisted'?'assisted':'success'):pending?'info':f.can_retry?'warning':'error';
  const title=f.result==='correct_independent'?'정답이에요':f.result==='correct_assisted'?'도움을 받아 맞혔어요':pending?'코치가 풀이를 확인해요':f.can_retry?'다시 확인해 보세요 · 한 번 더 풀 수 있어요':'풀이를 확인해 주세요';
  const sameItem=f.can_retry&&currentPlanIndex===f.plan_index+1;
  return <aside role="status" className={`${styles.panel} ${styles[tone]}`}><p className={styles.caption}>{sameItem?'방금 제출한 답':'이전 문항'}</p><strong><span aria-hidden="true">{correct?'✓':pending?'…':'!'}</span> {title}</strong><StepFeedback check={f.step_check} correct={correct}/>{f.hint&&<div>{renderMathMarkdown(f.hint)}</div>}{f.answer!==null&&<div>정답: {renderMathMarkdown(f.answer)}</div>}{f.explanation&&<div>{renderMathMarkdown(f.explanation)}</div>}</aside>;
}
