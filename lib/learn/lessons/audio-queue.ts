/** 관리자 음성 생성 대기열의 상태 계산. 화면(app/(admin)/AudioQueue.tsx)과 떼어 두어 따로 검사한다. */
export type AudioJob = {
  key: string; id: string; version: number; title: string;
  /** generate: 없는 문장 생성 · align: 정렬 정보가 없는 문장을 다시 받아 옴 */
  mode: 'generate' | 'align';
  /** 지정하면 이 문장들만(실패 재시도) */
  only?: string[];
  state: 'waiting' | 'running' | 'done' | 'stopped' | 'error';
  total: number; remaining: number; failed: string[]; note?: string;
};
export type AudioJobInput = Pick<AudioJob, 'id' | 'version' | 'title' | 'mode' | 'total' | 'only'>;
export const jobKey = (job: Pick<AudioJob, 'id' | 'version' | 'mode'>) => job.id + ':' + job.version + ':' + job.mode;

/** 이미 대기·진행 중인 강의는 다시 넣지 않고, 끝난 기록은 새 작업으로 바꾼다. */
export function enqueueJobs(jobs: AudioJob[], items: AudioJobInput[]): AudioJob[] {
  const next = [...jobs];
  for (const item of items) {
    const key = jobKey(item), at = next.findIndex(job => job.key === key);
    if (at >= 0 && (next[at].state === 'waiting' || next[at].state === 'running')) continue;
    const job: AudioJob = { ...item, key, state: 'waiting', remaining: item.total, failed: [] };
    if (at >= 0) next.splice(at, 1);
    next.push(job);
  }
  return next;
}

/** 저장해 둔 대기열 복원. 돌던 작업은 끊긴 것이므로 대기로 되돌린다. 직접 중단한 것은 그대로 둔다. */
export function restoreJobs(saved: unknown): AudioJob[] {
  if (!Array.isArray(saved)) return [];
  return saved.filter((job): job is AudioJob => !!job && typeof job === 'object' && typeof (job as AudioJob).id === 'string' && Number.isInteger((job as AudioJob).version)
    && ['generate', 'align'].includes((job as AudioJob).mode) && ['waiting', 'running', 'done', 'stopped', 'error'].includes((job as AudioJob).state))
    .map(job => ({ ...job, key: jobKey(job), failed: Array.isArray(job.failed) ? job.failed : [], state: job.state === 'running' ? 'waiting' : job.state, note: undefined }));
}

export function queueSummary(jobs: AudioJob[]) {
  const count = (state: AudioJob['state']) => jobs.filter(job => job.state === state).length;
  return { finished: count('done') + count('error'), stopped: count('stopped'), error: count('error'), waiting: count('waiting') + count('running') };
}

type Row = { id: string; version: number; status: string; missing: number; unaligned?: number };
/** 음성을 챙겨야 하는 버전: 강의마다 최신 버전과, 그와 다르면 학습자에게 보이는 버전(가장 최근의 reviewed·live). rows는 id별 최신 버전 먼저. */
export function relevantVersions<T extends Row>(rows: T[]): T[] {
  const seen = new Set<string>(), published = new Set<string>(), out: T[] = [];
  for (const row of rows) {
    const first = !seen.has(row.id), live = row.status !== 'draft' && !published.has(row.id);
    seen.add(row.id); if (live) published.add(row.id);
    if (first || live) out.push(row);
  }
  return out;
}
export const needsAudio = (row: Row) => row.missing > 0 || (row.unaligned ?? 0) > 0;
/** 한 강의에 필요한 작업. 없는 문장 생성이 먼저, 정렬만 없는 문장이 있으면 그다음. */
export function jobsFor(row: Row & { title: string }): AudioJobInput[] {
  return [
    ...(row.missing > 0 ? [{ id: row.id, version: row.version, title: row.title, mode: 'generate' as const, total: row.missing }] : []),
    ...((row.unaligned ?? 0) > 0 ? [{ id: row.id, version: row.version, title: row.title, mode: 'align' as const, total: row.unaligned! }] : []),
  ];
}
