import { describe, expect, it } from 'vitest';
import { enqueueJobs, jobsFor, needsAudio, queueSummary, relevantVersions, restoreJobs, type AudioJob } from './audio-queue';

const input = (id: string, mode: 'generate' | 'align' = 'generate') => ({ id, version: 1, title: id, mode, total: 5 });

describe('음성 생성 대기열', () => {
  it('넣은 순서대로 쌓고, 대기·진행 중인 강의는 다시 넣지 않는다', () => {
    let jobs = enqueueJobs([], [input('a'), input('b')]);
    expect(jobs.map(job => job.key)).toEqual(['a:1:generate', 'b:1:generate']);
    expect(jobs.every(job => job.state === 'waiting' && job.remaining === 5)).toBe(true);
    jobs = enqueueJobs(jobs.map(job => job.id === 'a' ? { ...job, state: 'running' as const, remaining: 2 } : job), [input('a'), input('b'), input('a', 'align')]);
    expect(jobs.map(job => job.key)).toEqual(['a:1:generate', 'b:1:generate', 'a:1:align']);
    expect(jobs[0].remaining).toBe(2);
  });
  it('끝난 기록은 새 작업으로 바꿔 맨 뒤에 둔다 (실패 문장 재시도)', () => {
    const done: AudioJob[] = enqueueJobs([], [input('a'), input('b')]).map(job => job.id === 'a' ? { ...job, state: 'error', failed: ['s1'] } : job);
    const jobs = enqueueJobs(done, [{ ...input('a'), total: 1, only: ['s1'] }]);
    expect(jobs.map(job => [job.id, job.state])).toEqual([['b', 'waiting'], ['a', 'waiting']]);
    expect(jobs[1]).toMatchObject({ only: ['s1'], remaining: 1, failed: [] });
  });
  it('복원하면 돌던 작업은 대기로, 직접 중단한 것은 그대로 둔다', () => {
    const saved = [{ ...enqueueJobs([], [input('a')])[0], state: 'running', note: '재시도' }, { ...enqueueJobs([], [input('b')])[0], state: 'stopped' }, { id: 3 }, null, { id: 'x', version: 1, mode: 'nope', state: 'waiting' }];
    const jobs = restoreJobs(saved);
    expect(jobs.map(job => [job.id, job.state, job.note])).toEqual([['a', 'waiting', undefined], ['b', 'stopped', undefined]]);
    expect(restoreJobs('깨진 값')).toEqual([]);
    expect(queueSummary(jobs)).toEqual({ finished: 0, stopped: 1, error: 0, waiting: 1 });
  });
  it('음성을 챙길 버전은 최신 버전과 학습자에게 보이는 버전이다', () => {
    const rows = [
      { id: 'a', version: 3, status: 'draft', missing: 5, title: 'a' }, { id: 'a', version: 2, status: 'reviewed', missing: 2, title: 'a' }, { id: 'a', version: 1, status: 'reviewed', missing: 9, title: 'a' },
      { id: 'b', version: 1, status: 'live', missing: 0, unaligned: 3, title: 'b' }, { id: 'c', version: 2, status: 'draft', missing: 0, title: 'c' }, { id: 'c', version: 1, status: 'draft', missing: 4, title: 'c' },
    ];
    expect(relevantVersions(rows).map(row => row.id + row.version)).toEqual(['a3', 'a2', 'b1', 'c2']);
    expect(relevantVersions(rows).filter(needsAudio).map(row => row.id + row.version)).toEqual(['a3', 'a2', 'b1']);
    expect(jobsFor(rows[3]).map(job => job.mode)).toEqual(['align']);
    expect(jobsFor({ ...rows[0], unaligned: 1 }).map(job => [job.mode, job.total])).toEqual([['generate', 5], ['align', 1]]);
  });
});
