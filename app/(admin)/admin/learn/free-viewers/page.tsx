import { requireCoach, runtimeError } from '@/lib/learn/runtime';
import { freeViewers } from '@/lib/learn/free-viewers';
import { FREE_LESSON_IDS } from '@/lib/learn/lessons/free-access';
import styles from '../learners/learners.module.css';

export const metadata = { title: '무료 강의 시청자', robots: { index: false, follow: false } };
const fmt = (iso: string | null) => iso ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '-';

export default async function FreeViewersPage() {
  try {
    await requireCoach();
    const rows = await freeViewers();
    return <section className={styles.page}>
      <h1>무료 강의 시청자</h1>
      <p>뿌리깊은수학 무료 강의를 로그인해서 본 사람(수강생·관리자 제외) {rows.length}명 · 최근 활동순. 1강만 본 비로그인 시청자는 기록되지 않습니다.</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead><tr>{['이름', '연락처', '가입 경로', '가입', '연 강의', '완료', '마지막 강의', '마지막 활동'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.user_id}>
          {[r.name ?? '-', r.phone ?? '-', r.lead_source === 'studio_free' ? '무료 강의' : r.lead_source ?? '-', fmt(r.joined), `${r.opened} / ${FREE_LESSON_IDS.length}`, String(r.completed), r.lastLesson, fmt(r.lastAt)].map((v, i) => <td key={i} style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{v}</td>)}
        </tr>)}</tbody>
      </table>
    </section>;
  } catch (error) { return <section className={styles.page}><h1>무료 강의 시청자</h1><p role="alert">{runtimeError(error, 'admin.freeViewers')}</p></section>; }
}
