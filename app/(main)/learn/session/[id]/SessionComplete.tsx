import Button from '@/components/Button/Button';
import { FeedbackPanel } from '@/components/learn/FeedbackPanel';
import type { Feedback } from '@/lib/learn/learning-session';
import styles from '../../learn.module.css';
export type CompletionSummary={correct?:number;newly_verified?:string[];next_review_at?:string|null;timed_out?:boolean};
export function SessionComplete({summary,topicNames,hasReview,feedback}:{summary:CompletionSummary;topicNames:string[];hasReview:boolean;feedback:Feedback|null}) {
  return <><FeedbackPanel feedback={feedback}/><section className={styles.card}><span aria-hidden="true">✓</span><h2>{summary.timed_out?'오늘은 여기까지':'학습을 마쳤어요'}</h2>{summary.timed_out&&<p>시간이 다 됐어요. 푼 만큼은 저장됐어요</p>}<dl className={styles.results}><div><dt>정답</dt><dd>{summary.correct??0}<small>문항</small></dd></div><div><dt>새로 완료한 주제</dt><dd>{summary.newly_verified?.length??0}<small>개</small></dd></div><div><dt>다음 복습</dt><dd className={styles.date}>{summary.next_review_at?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'}).format(new Date(summary.next_review_at)):'예정 없음'}</dd></div></dl>{topicNames.length>0&&<ul className={styles.badges}>{topicNames.map((name,i)=><li className={styles.badge} key={i}>✓ {name}</li>)}</ul>}<Button href="/learn" size="lg" fullWidth>학습 홈으로</Button>{hasReview&&<Button href="/learn/review" variant="outline" size="lg" fullWidth>복습 하러 가기</Button>}</section></>;
}
