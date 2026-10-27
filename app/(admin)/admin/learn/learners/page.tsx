import Link from 'next/link';
import { learnerList } from '@/lib/learn/coach-runtime';
import { runtimeError } from '@/lib/learn/runtime';
import styles from './learners.module.css';
export default async function LearnersPage() {
  try {const learners=await learnerList();return <section className={styles.page}><h1>학습자</h1><p>코치 확인 대기 {learners.filter(row=>row.status==='awaiting_coach').length}명</p><div className={styles.list}>{learners.map(row=><article className={styles.card} key={row.user_id}><h2><Link href={`/admin/learn/learners/${row.user_id}`}>{row.name}</Link></h2><p>{row.status==='awaiting_coach'?<strong className={styles.badge}>코치 확인 대기</strong>:row.status}</p><p>마지막 활동: {row.last_activity?new Date(row.last_activity).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'없음'}</p><p>사진 검토 대기 {row.pending_photos}개</p></article>)}</div>{!learners.length&&<p>아직 진단을 시작한 학습자가 없습니다.</p>}</section>;}catch(error){return <section className={styles.page}><h1>학습자</h1><p role="alert">{runtimeError(error, 'app/(admin)/admin/learn/learners/page.tsx')}</p></section>;}
}
