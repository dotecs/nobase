import { MathPreview } from './MathPreview';
import type { StepCheck } from '@/lib/learn/mathcheck/steps';
import styles from './feedback.module.css';

export function StepFeedback({check,correct}:{check?:StepCheck;correct:boolean}) {
  if(!check?.lines.length)return null;
  const index=check.first_error_index;
  if(index!==null)return <div className={styles.caption}><p>풀이 {index+1}번째 줄{correct?'은 다시 봐 두세요':'부터 다시 확인해 보세요'}</p><MathPreview value={check.lines[index]?.input??''} caption={false} help={false}/></div>;
  if(check.lines.every(line=>line.status==='ok'))return <p className={styles.caption}>풀이 {check.checked}줄 모두 맞아요</p>;
  return null;
}
