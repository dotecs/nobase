'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { runAudioBatches } from '@/lib/learn/lessons/audio-batches';
import { enqueueJobs, queueSummary, restoreJobs, type AudioJob, type AudioJobInput } from '@/lib/learn/lessons/audio-queue';
import { generateAudio } from './admin/learn/lessons/actions';
import styles from './audio-queue.module.css';

/**
 * 음성 생성 대기열. 관리자 레이아웃에 걸려 있어 관리자 화면 안에서 페이지를 옮겨도 계속 돈다.
 * 대기열은 브라우저에 저장되므로 새로고침하거나 관리자 화면을 떠났다 돌아오면 남은 강의부터 이어간다.
 * 생성은 문장 해시 기준이라 같은 강의를 다시 돌려도 이미 만든 문장은 건너뛴다.
 */
const STORAGE = 'nobase.admin.audioQueue.v1';
const LOCK = 'nobase-admin-audio-queue';
type Queue = { jobs: AudioJob[]; active: boolean; enqueue: (items: AudioJobInput[]) => void; stop: () => void; resume: () => void; clear: () => void };
const idle: Queue = { jobs: [], active: false, enqueue: () => {}, stop: () => {}, resume: () => {}, clear: () => {} };
const Context = createContext<Queue>(idle);
export const useAudioQueue = () => useContext(Context);

const STATE: Record<AudioJob['state'], string> = { waiting: '대기', running: '생성 중', done: '완료', stopped: '중단됨', error: '오류' };

export function AudioQueueProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<AudioJob[]>([]), [active, setActive] = useState(false), [open, setOpen] = useState(false);
  const jobsRef = useRef<AudioJob[]>([]), running = useRef(false), halt = useRef(false), gone = useRef(false);

  const update = useCallback((change: (jobs: AudioJob[]) => AudioJob[]) => {
    jobsRef.current = change(jobsRef.current);
    setJobs(jobsRef.current);
    try { localStorage.setItem(STORAGE, JSON.stringify(jobsRef.current)); } catch { /* 저장소를 못 써도 이 탭에서는 계속 돈다 */ }
  }, []);
  const patch = useCallback((key: string, values: Partial<AudioJob>) => update(list => list.map(job => job.key === key ? { ...job, ...values } : job)), [update]);

  const runJob = useCallback(async (job: AudioJob) => {
    patch(job.key, { state: 'running', note: undefined });
    const failures = new Set<string>();
    const outcome = await runAudioBatches(
      () => generateAudio(job.id, job.version, { forceAlignment: job.mode === 'align', sentenceIds: job.only, excludeIds: [...failures] }),
      { automatic: true, shouldContinue: () => !halt.current,
        onRetry: attempt => patch(job.key, { note: '응답이 끊겨 저장을 기다린 뒤 이어갑니다 (' + attempt + '/2)' }),
        onBatch: response => { response.result?.failed.forEach(item => failures.add(item.sentence_id)); if (response.result) patch(job.key, { remaining: response.result.remaining, failed: [...failures], note: undefined }); else if (response.error) patch(job.key, { note: response.error }); } });
    const failed = [...failures];
    if (outcome === 'complete') patch(job.key, { state: failed.length ? 'error' : 'done', remaining: failed.length, failed, note: failed.length ? '실패 ' + failed.length + '문장' : undefined });
    else if (outcome === 'paused') patch(job.key, { state: gone.current ? 'waiting' : 'stopped', failed }); // 화면을 떠나서 끊긴 것은 돌아오면 이어간다
    else patch(job.key, { state: 'error', failed, note: outcome === 'no-key' ? '음성 키 없음' : outcome === 'no-progress' ? '진행이 없어 멈췄습니다' : '응답 오류. 다시 시작하면 저장된 문장부터 이어집니다' });
    return outcome;
  }, [patch]);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true; halt.current = false; setActive(true);
    const work = async () => {
      for (;;) {
        const job = jobsRef.current.find(item => item.state === 'waiting');
        if (!job || halt.current) break;
        if (await runJob(job) === 'no-key') break;
        router.refresh();
      }
    };
    // 탭을 여러 개 열어도 한 탭만 생성한다.
    try { if (typeof navigator !== 'undefined' && navigator.locks) await navigator.locks.request(LOCK, work); else await work(); }
    finally { running.current = false; setActive(false); router.refresh(); }
  }, [router, runJob]);

  // 떠났다 돌아오면 남은 강의부터 이어간다. 직접 중단한 것은 그대로 둔다.
  useEffect(() => {
    halt.current = false; gone.current = false;
    try { const saved = restoreJobs(JSON.parse(localStorage.getItem(STORAGE) ?? '[]')); jobsRef.current = saved; setJobs(saved); if (saved.some(job => job.state === 'waiting')) void pump(); } catch { /* 저장된 대기열이 없거나 깨졌으면 빈 대기열 */ }
    return () => { halt.current = true; gone.current = true; };
  }, [pump]);
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);

  const queue = useMemo<Queue>(() => ({
    jobs, active,
    enqueue: items => { update(list => enqueueJobs(list, items)); void pump(); },
    stop: () => { halt.current = true; update(list => list.map(job => job.state === 'waiting' ? { ...job, state: 'stopped' } : job)); },
    resume: () => { update(list => list.map(job => job.state === 'stopped' ? { ...job, state: 'waiting' } : job)); void pump(); },
    clear: () => update(list => list.filter(job => job.state === 'waiting' || job.state === 'running')),
  }), [jobs, active, update, pump]);

  const summary = queueSummary(jobs), current = jobs.find(job => job.state === 'running');
  return <Context.Provider value={queue}>
    {children}
    {jobs.length > 0 && <aside className={styles.dock} aria-label="음성 생성 대기열">
      <div className={styles.head}>
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen(value => !value)}>
          <span className={styles.dot} data-active={active} aria-hidden="true" />
          <strong role="status">{active ? '음성 생성 중' : summary.stopped ? '음성 생성 중단됨' : summary.error ? '음성 생성 끝 · 확인 필요' : '음성 생성 완료'}</strong>
          <span className={styles.count}>{summary.finished}/{jobs.length}</span>
        </button>
        {active ? <button type="button" onClick={queue.stop}>중단</button> : summary.stopped ? <button type="button" onClick={queue.resume}>이어서</button> : <button type="button" onClick={queue.clear}>닫기</button>}
      </div>
      {current && <p className={styles.current}>{current.title} · 남은 문장 {current.remaining}{current.note ? ' · ' + current.note : ''}</p>}
      {active && <p className={styles.hint}>관리자 화면 안에서는 다른 메뉴로 옮겨도 계속됩니다.</p>}
      {open && <ul className={styles.list}>{jobs.map(job => <li key={job.key} data-state={job.state}>
        <span className={styles.name}>{job.title}<small>{job.id} · v{job.version}{job.mode === 'align' ? ' · 정렬' : ''}</small></span>
        <span className={styles.state}>{STATE[job.state]}{job.state === 'running' || job.state === 'stopped' ? ' · 남음 ' + job.remaining : ''}{job.note ? ' · ' + job.note : ''}</span>
        {job.state === 'error' && job.failed.length > 0 && !active && <button type="button" onClick={() => queue.enqueue([{ id: job.id, version: job.version, title: job.title, mode: job.mode, total: job.failed.length, only: job.failed }])}>실패 {job.failed.length}문장 다시</button>}
      </li>)}</ul>}
      <Link className={styles.link} href="/admin/learn/lessons">강의 관리로</Link>
    </aside>}
  </Context.Provider>;
}
