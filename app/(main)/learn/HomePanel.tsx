import { Button } from '@/components';
import type { HomeSummary } from '@/lib/learn/home-summary';
import { StartDiagnostic } from './StartDiagnostic';
import { StartSession } from './StartSession';
import styles from './learn.module.css';
export function HomePanel({status,minutes,photoRequired,summary,due=0,itemsPerSession,maxMinutes,openSessionId}:{status:string;minutes:number;photoRequired:boolean;summary?:HomeSummary;due?:number;itemsPerSession?:number;maxMinutes?:number;openSessionId?:string}){
  if(status==='diagnostic_pending')return <><section className={styles.card}><h2>출발점 진단</h2><p>약 {minutes}분 · 6문항 안팎 · 정답은 알려주지 않아요</p>{photoRequired&&<p>풀이 사진이 필요해요</p>}<StartDiagnostic/></section><section className={styles.card}><h2>내게 맞는 시작점을 찾아요</h2><p>지금 알고 있는 내용을 확인해요.<br/>결과를 바탕으로 코치가 학습할 내용을 안내해 드려요.</p></section></>;
  if(status==='diagnostic_in_progress')return <section className={styles.card}><h2>진단을 이어서 풀어요</h2><Button href="/learn/diagnostic" size="lg" fullWidth>이어하기</Button></section>;
  if(status==='awaiting_coach')return <section className={styles.card}><h2>코치가 결과를 보고 있어요</h2><p>확인이 끝나면 여기서 학습을 시작할 수 있어요</p></section>;
  if(status!=='active')return <section className={styles.card}><h2>학습이 잠시 멈춰 있어요</h2><p>학습이 잠시 멈춰 있어요. 코치에게 문의해 주세요.</p></section>;
  const done=summary?summary.verified+summary.retained:0,max=Math.max(1,...(summary?.activity.map(row=>row.count)??[]));
  return <div className={styles.homeGrid}>
    {due>0&&<aside className={`${styles.card} ${styles.reviewBanner}`}><p>오늘 복습 {due}개가 기다리고 있어요</p><Button href="/learn/review" variant="outline" size="lg" fullWidth>복습 먼저 하기</Button></aside>}
    <section className={styles.card}><h2>오늘의 학습</h2><p>{itemsPerSession}문항 · 약 {maxMinutes}분</p>{openSessionId?<Button href={`/learn/session/${openSessionId}`} size="lg" fullWidth>이어하기</Button>:<StartSession/>}</section>
    {summary&&<><section className={styles.card}><h2>{summary.goalTitle}</h2><p className={styles.stat}>{done} / {summary.total}<span>완료한 주제</span></p><progress aria-label="목표 진행률" value={done} max={Math.max(1,summary.total)}/><p>완료 {summary.verified}개 · 유지 {summary.retained}개</p>{summary.total>0&&done===summary.total&&<p className={styles.badge}>✓ 목표를 모두 달성했어요</p>}</section>
    <section className={styles.card}><h2>주제 지도</h2><div className={styles.units}>{summary.units.map(unit=><div key={unit.id}><p>{unit.title}<span>{unit.mastered} / {unit.total}개</span></p><div className={styles.topicDots}>{unit.abilities.map(ability=><span key={ability.id} title={ability.name} aria-label={ability.name} data-topic-dot className={`${styles.topicDot} ${ability.state==='verified'||ability.state==='retained'?styles.mastered:ability.state!=='unknown'?styles.inProgress:''}`}/>)}</div></div>)}</div><p className={styles.help}>● 완료 · 학습 중 · 아직 시작하지 않은 주제를 보여드려요</p></section>
    <section className={styles.card}><h2>최근 7일 활동</h2><ul className={styles.activity}>{summary.activity.map(row=><li key={row.date}><div className={styles.barTrack}>{row.count>0?<div className={styles.activityBar} style={{height:`${row.count/max*100}%`}}/>:<div className={styles.emptyBar}/>}</div><strong>{row.count}회</strong><time dateTime={row.date} title={row.date}>{new Intl.DateTimeFormat('ko-KR',{weekday:'narrow',timeZone:'Asia/Seoul'}).format(new Date(`${row.date}T00:00:00+09:00`))}</time></li>)}</ul></section></>}
  </div>;
}
