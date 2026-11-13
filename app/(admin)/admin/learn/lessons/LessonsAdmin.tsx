'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LessonRow } from '@/lib/learn/lessons/types';
import { jobKey, jobsFor, needsAudio, relevantVersions, type AudioJob } from '@/lib/learn/lessons/audio-queue';
import { useAudioQueue } from '../../../AudioQueue';
import styles from './lessons.module.css';

/** characters: 아직 만들지 않은 문장 전체의 글자 수. rows는 id별 최신 버전 먼저. */
export type AdminLesson = Pick<LessonRow, 'id' | 'version' | 'title' | 'kind' | 'status'> & { total: number; generated: number; missing: number; batch: number; characters: number; unaligned?: number };
const STATUS: Record<string, string> = { draft: '초안', reviewed: '검수 완료', live: '게시됨' };
const KIND: Record<string, string> = { concept: '개념', worked: '문제풀이' };
const JOB: Record<AudioJob['state'], string> = { waiting: '대기 중', running: '생성 중', done: '완료', stopped: '중단됨', error: '확인 필요' };
const keyOf = (row: AdminLesson) => row.id + ':' + row.version;
const preview = (row: AdminLesson) => '/learn/lesson/' + encodeURIComponent(row.id) + '?draft=1';

export function LessonsAdmin({ rows, hasKey, advance }: { rows: AdminLesson[]; hasKey: boolean; advance: (id: string, version: number, status: 'reviewed' | 'live') => Promise<{ error?: string }> }) {
  const queue = useAudioQueue(), router = useRouter();
  const [picked, setPicked] = useState<string[]>([]), [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [query, setQuery] = useState('');

  const relevant = useMemo(() => relevantVersions(rows), [rows]);
  const todo = relevant.filter(needsAudio);
  const published = useMemo(() => { const map = new Map<string, number>(); for (const row of rows) if (row.status !== 'draft' && !map.has(row.id)) map.set(row.id, row.version); return map; }, [rows]);
  const lessons = useMemo(() => { const map = new Map<string, AdminLesson[]>(); for (const row of rows) map.set(row.id, [...(map.get(row.id) ?? []), row]); return [...map.values()]; }, [rows]);
  // 대기열에 들어간 강의의 현재 상태(생성 → 정렬 순서로 앞의 것)
  const jobOf = (row: AdminLesson) => (['generate', 'align'] as const).map(mode => queue.jobs.find(job => job.key === jobKey({ ...row, mode }))).find(job => job && job.state !== 'done') ?? undefined;
  const queued = (row: AdminLesson) => { const job = jobOf(row); return !!job && (job.state === 'waiting' || job.state === 'running'); };

  const selectable = todo.filter(row => !queued(row)), chosen = selectable.filter(row => picked.includes(keyOf(row)));
  const sentences = chosen.reduce((n, row) => n + row.missing, 0), characters = chosen.reduce((n, row) => n + (row.missing > 0 ? row.characters : 0), 0), realign = chosen.reduce((n, row) => n + (row.unaligned ?? 0), 0);
  const toggle = (row: AdminLesson) => { setConfirming(false); setPicked(old => old.includes(keyOf(row)) ? old.filter(key => key !== keyOf(row)) : [...old, keyOf(row)]); };
  const start = () => { queue.enqueue(chosen.flatMap(jobsFor)); setPicked([]); setConfirming(false); setMessage(chosen.length + '개 강의를 음성 생성 대기열에 넣었습니다.'); };

  async function change(row: AdminLesson, status: 'reviewed' | 'live') {
    setBusy(true); setMessage('');
    try { const result = await advance(row.id, row.version, status); setMessage(result.error ?? row.title + ': ' + STATUS[status] + '(으)로 바꿨습니다.'); router.refresh(); }
    catch { setMessage('처리하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }

  const word = query.trim().toLowerCase(), shown = lessons.filter(versions => !word || versions[0].title.toLowerCase().includes(word) || versions[0].id.toLowerCase().includes(word));
  const audioText = (row: AdminLesson) => row.total === 0 ? '문장 없음' : row.missing > 0 ? `음성 ${row.generated}/${row.total}` : (row.unaligned ?? 0) > 0 ? `음성 완료 · 정렬 없음 ${row.unaligned}` : '음성 완료';

  return <section className={styles.page}>
    <header><h1>시각 레슨 관리</h1><p className={styles.sub}>강의 {lessons.length}개 · 음성 처리 필요 {todo.length}개</p></header>
    {!hasKey && <p role="status" className={styles.notice}>키 없음 — 음성 생성 키가 설정되지 않아 음성을 만들 수 없습니다.</p>}
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {!rows.length && <p>등록된 레슨이 없습니다. 검증한 JSON을 seed로 등록해 주세요.</p>}

    {todo.length > 0 && <section className={styles.todo} aria-labelledby="todo-title">
      <div className={styles.todoHead}>
        <h2 id="todo-title">음성 처리 필요 <span className={styles.badge}>{todo.length}</span></h2>
        {hasKey && selectable.length > 0 && <label className={styles.all}><input type="checkbox" checked={chosen.length === selectable.length} onChange={event => { setConfirming(false); setPicked(event.target.checked ? selectable.map(keyOf) : []); }} />전체 선택</label>}
      </div>
      <ul className={styles.rows}>{todo.map(row => {
        const job = jobOf(row), waiting = queued(row);
        return <li key={keyOf(row)} className={styles.row} data-queued={waiting}>
          {hasKey && <input type="checkbox" aria-label={row.title + ' 선택'} checked={picked.includes(keyOf(row)) && !waiting} disabled={waiting} onChange={() => toggle(row)} />}
          <div className={styles.main}><strong>{row.title}</strong><small>{row.id} · v{row.version} · {STATUS[row.status] ?? row.status}{published.get(row.id) === row.version && row.version !== rows.find(other => other.id === row.id)!.version ? ' · 학습자에게 보이는 버전' : ''}</small></div>
          <span className={styles.need}>{row.missing > 0 ? `미생성 ${row.missing}/${row.total}` : `정렬 없음 ${row.unaligned}`}</span>
          {job ? <span className={styles.job} data-state={job.state}>{JOB[job.state]}{job.state === 'running' ? ' · 남음 ' + job.remaining : ''}</span> : <a className={styles.link} href={preview(row)} target="_blank" rel="noreferrer">미리보기</a>}
        </li>;
      })}</ul>
      {hasKey && <div className={styles.bulk}>
        <span>{chosen.length ? `선택 ${chosen.length}개 · ${sentences}문장 · 약 ${characters.toLocaleString()}자${realign ? ` · 정렬 다시 받기 ${realign}문장` : ''}` : '음성을 만들 강의를 선택하세요.'}</span>
        {!confirming && <button type="button" className={styles.primary} disabled={!chosen.length} onClick={() => setConfirming(true)}>선택한 강의 처리</button>}
        {confirming && <div className={styles.confirmation}>
          <p>선택한 {chosen.length}개 강의를 차례로 처리합니다. 예상 크레딧: 계정·모델 요율 미확인. 실패한 문장은 건너뛰고 계속하며, 끝난 뒤 다시 시도할 수 있습니다.</p>
          <p>관리자 화면 안에서는 다른 메뉴로 옮겨도 계속됩니다. 브라우저를 닫거나 관리자 화면을 떠나면 멈추고, 다시 들어오면 남은 강의부터 이어갑니다.</p>
          <button type="button" className={styles.primary} onClick={start}>생성 시작</button><button type="button" onClick={() => setConfirming(false)}>취소</button>
        </div>}
      </div>}
    </section>}

    {rows.length > 0 && <section aria-labelledby="all-title">
      <div className={styles.todoHead}><h2 id="all-title">전체 강의</h2><input className={styles.search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="강의 찾기" aria-label="강의 찾기" /></div>
      <ul className={styles.lessons}>{shown.map(versions => {
        const latest = versions[0], main = versions.filter(row => relevant.includes(row)), old = versions.filter(row => !relevant.includes(row));
        return <li key={latest.id} className={styles.lesson}>
          <div className={styles.lessonHead}><strong>{latest.title}</strong><small>{latest.id} · {KIND[latest.kind] ?? latest.kind}</small></div>
          {main.map(row => <div key={row.version} className={styles.version}>
            <span className={styles.chip} data-status={row.status}>v{row.version} {STATUS[row.status] ?? row.status}</span>
            <span className={styles.audio} data-need={needsAudio(row)}>{audioText(row)}</span>
            {published.get(row.id) === row.version && <span className={styles.shownTo}>학습자에게 보이는 버전</span>}
            <span className={styles.actions}>
              {row === latest && <a className={styles.link} href={preview(row)} target="_blank" rel="noreferrer">미리보기</a>}
              {row.status === 'draft' && <button type="button" disabled={busy} onClick={() => void change(row, 'reviewed')}>검수 완료로</button>}
              {row.status === 'reviewed' && <button type="button" disabled={busy} onClick={() => void change(row, 'live')}>게시</button>}
            </span>
          </div>)}
          {old.length > 0 && <details className={styles.old}><summary>이전 버전 {old.length}개</summary><ul>{old.map(row => <li key={row.version}>v{row.version} · {STATUS[row.status] ?? row.status} · {audioText(row)}</li>)}</ul></details>}
        </li>;
      })}</ul>
      {shown.length === 0 && <p className={styles.sub}>찾는 강의가 없습니다.</p>}
    </section>}
  </section>;
}
