import Link from 'next/link';
import { learningView } from '@/lib/learn/learning-runtime';
import { runtimeError } from '@/lib/learn/runtime';
import { LearningClient,FeedbackPanel } from './LearningClient';
import styles from '../../learn.module.css';
export default async function LearningPage({params}:{params:Promise<{id:string}>}){
  try {const view=await learningView((await params).id);
    if(view.complete){const summary=view.summary as {correct?:number;newly_verified?:string[];next_review_at?:string|null;timed_out?:boolean};return <main className={styles.page}><h1>{summary.timed_out?'오늘은 여기까지':'학습을 마쳤습니다'}</h1><section className={styles.card}><FeedbackPanel feedback={view.feedback}/><p>정답 제출 {summary.correct??0}회 · 새로 검증된 소주제 {summary.newly_verified?.length??0}개</p><p>다음 복습: {summary.next_review_at?new Date(summary.next_review_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}):'예정 없음'}</p><Link href="/learn">학습 홈으로</Link></section></main>;}
    return <main className={styles.page}><h1>오늘의 학습</h1><LearningClient key={`${view.sessionId}:${view.planIndex}`} {...view}/></main>;
  }catch(error){return <main className={styles.page}><p role="alert">{runtimeError(error)}</p><Link href="/learn">학습 홈으로</Link></main>;}
}
