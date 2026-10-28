import Link from 'next/link';
import { Button } from '@/components';
import type { HomeSummary } from '@/lib/learn/home-summary';
import { StartDiagnostic } from './StartDiagnostic';
import { StartSession } from './StartSession';
import styles from './learn.module.css';
export function HomePanel({status,minutes,photoRequired,summary,due=0}:{status:string;minutes:number;photoRequired:boolean;summary?:HomeSummary;due?:number}){
  if(status==='diagnostic_pending')return <section className={styles.card}><h2>나의 출발점 찾기</h2><p>약 {minutes}분 동안 문제를 풀어 주세요. {photoRequired?'풀이 사진이 필요합니다.':'풀이 사진은 선택입니다.'}</p><StartDiagnostic/></section>;
  if(status==='diagnostic_in_progress')return <section className={styles.card}><h2>진단이 진행 중입니다</h2><Button href="/learn/diagnostic" size="lg" fullWidth>진단 이어하기</Button></section>;
  if(status==='awaiting_coach')return <section className={styles.card}><h2>코치가 확인 중입니다</h2><p>진단 결과와 학습 경로를 확인한 뒤 안내해 드릴게요.</p></section>;
  if(status!=='active')return <p>학습이 일시 중지되어 있습니다. 코치에게 문의해 주세요.</p>;
  return <div className={styles.homeGrid}><section className={styles.card}><h2>오늘의 학습</h2><p>나에게 맞는 문항을 차근차근 풀어보세요.</p><StartSession/><Link href="/learn/review" className={styles.reviewLink}>오늘 복습 <strong>{due}개</strong></Link></section>{summary&&<>
    <section className={styles.card}><h2>{summary.goalTitle}</h2><p className={styles.stat}>{summary.verified+summary.retained} / {summary.total}<span>목표 소주제</span></p><progress aria-label="목표 진행률" value={summary.verified+summary.retained} max={Math.max(1,summary.total)}/><p>검증 완료 {summary.verified}개 · 유지 {summary.retained}개</p></section>
    <section className={`${styles.card} ${styles.fullWidth}`}><h2>단원별 진행</h2><div className={styles.units}>{summary.units.map(unit=><div key={unit.id}><p>{unit.title} <span>{unit.mastered}/{unit.total}</span></p><progress aria-label={`${unit.title} 진행률`} value={unit.mastered} max={Math.max(1,unit.total)}/></div>)}</div></section>
    <section className={`${styles.card} ${styles.fullWidth}`}><h2>최근 7일 활동</h2><ul className={styles.activity}>{summary.activity.map(row=><li key={row.date}><time dateTime={row.date}>{row.date.slice(5).replace('-','/')}</time><strong>{row.count}</strong><span>회 제출</span></li>)}</ul></section>
  </>}</div>;
}
