'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { endCohortEnrollments } from './actions';
import styles from './endCohortEnrollments.module.css';

export default function EndCohortEnrollments({ cohortId, title, activeCount }: { cohortId: string; title: string; activeCount: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [confirmation, setConfirmation] = useState(''), [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const valid = confirmation === title && reason.trim().length >= 2 && reason.trim().length <= 200 && activeCount !== null && activeCount > 0;
  const submit = () => {
    if (pending || !valid) return;
    startTransition(async () => {
      try {
        const result = await endCohortEnrollments({ cohortId, reason });
        setMessage(result.message); setOpen(false); setReason(''); setConfirmation(''); router.refresh();
      } catch { setMessage('요청을 처리하지 못했습니다. 수강 상태를 확인해 주세요.'); }
    });
  };
  return <section className={styles.section} aria-label="기수 수강 일괄 종료">
    <h2>기수 수강 종료</h2>
    <p>수강 중인 학생만 종료합니다. 일시정지·입금 대기·결제 중 상태는 유지됩니다.</p>
    <button type="button" disabled={pending || activeCount === null || activeCount === 0} onClick={() => { setOpen(true); setMessage(''); }}>이 기수 수강 전원 종료</button>
    {activeCount === null && <p role="status">수강 인원을 불러오지 못했습니다. 새로고침해 주세요.</p>}
    {activeCount === 0 && <p>종료할 수강 중인 학생이 없습니다.</p>}
    {open && <div className={styles.panel} role="group" aria-label="일괄 종료 확인">
      <p><strong>{title} · 현재 수강 중 {activeCount}명</strong></p>
      <p>실행 시점의 수강 중인 학생을 종료하며 학습 접근이 차단됩니다. 되돌리려면 사용자 상세에서 한 명씩 재개해 주세요.</p>
      <label htmlFor="cohort-end-reason">종료 사유 (필수, 2~200자)</label>
      <textarea id="cohort-end-reason" maxLength={200} value={reason} disabled={pending} onChange={event => setReason(event.target.value)} />
      <label htmlFor="cohort-end-confirmation">확인하려면 기수명 “{title}”을 그대로 입력해 주세요.</label>
      <input id="cohort-end-confirmation" autoComplete="off" value={confirmation} disabled={pending} onChange={event => setConfirmation(event.target.value)} />
      <div className={styles.buttons}>
        <button type="button" disabled={pending || !valid} onClick={submit}>{pending ? '종료 중…' : '확인 · 일괄 종료'}</button>
        <button type="button" disabled={pending} onClick={() => { setOpen(false); setReason(''); setConfirmation(''); }}>취소</button>
      </div>
    </div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
