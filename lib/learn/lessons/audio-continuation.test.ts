import { expect, it, vi } from 'vitest';
import { generateLessonAudio, audioHash } from './audio';
import { runAudioBatches } from './audio-batches';
import { AUDIO_BATCH_LIMIT, AUDIO_BATCH_BUDGET_MS, AUDIO_RETRY_SETTLE_MS } from './audio-batch-settings';
import { prototypeLesson } from './prototype-fixture';
import type { AudioRow } from './types';

function harness() {
  const lesson = prototypeLesson();
  lesson.scenes = [{ ...lesson.scenes[0], narration: Array.from({ length: 28 }, (_, i) => ({ id: 'sentence-' + i, role: 'say' as const, text: '서로 다른 문장 ' + i })) }];
  const saved: AudioRow[] = [];
  let clock = 0;
  const fetcher = vi.fn<typeof fetch>(async () => {
    clock += 3000;
    return Response.json({ audio_base64: 'SUQz', alignment: { characters: ['가'], character_start_times_seconds: [0], character_end_times_seconds: [.5] } });
  });
  const generate = async () => ({ result: await generateLessonAudio(lesson, 1, {
    key: 'mock-key', existing: saved, fetcher, now: () => clock,
    save: async row => { clock += 500; saved.push({ ...row, created_at: '' }); },
  }) });
  return { lesson, saved, fetcher, generate, now: () => clock, wait: async (ms: number) => { clock += ms; } };
}

it('automatically finishes 28 slow sentences across short requests, past the previous ~15-sentence stop', async () => {
  const h = harness(), onBatch = vi.fn();
  const result = await runAudioBatches(h.generate, { automatic: true, shouldContinue: () => true, onBatch });
  expect(result).toBe('complete');
  expect(h.saved).toHaveLength(28);
  expect(h.fetcher).toHaveBeenCalledTimes(28);
  expect(onBatch).toHaveBeenCalledTimes(Math.ceil(28 / AUDIO_BATCH_LIMIT));
  expect(onBatch.mock.calls.every(([response]) => response.result.generated <= AUDIO_BATCH_LIMIT)).toBe(true);
  expect(new Set(h.saved.map(row => row.sentence_id)).size).toBe(28);
});

it('rechecks saved hashes after a lost response and never regenerates already saved sentences', async () => {
  const h = harness(), onRetry = vi.fn();
  let lost = false;
  const generate = async () => {
    const response = await h.generate();
    if (!lost) { lost = true; throw new Error('response lost after saving'); }
    return response;
  };
  const wait = vi.fn(h.wait);
  expect(await runAudioBatches(generate, { automatic: true, shouldContinue: () => true, onBatch: () => {}, onRetry, now: h.now, wait })).toBe('complete');
  expect(h.fetcher).toHaveBeenCalledTimes(28);
  expect(h.saved).toHaveLength(28);
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(wait).toHaveBeenCalledWith(AUDIO_RETRY_SETTLE_MS - AUDIO_BATCH_LIMIT * 3500);
  expect(h.saved[0].text_hash).toBe(audioHash(h.lesson.scenes[0].narration[0]));
});

it('bounds transport retries and surfaces a recoverable error', async () => {
  const generate = vi.fn().mockRejectedValue(new Error('offline')), onBatch = vi.fn();
  expect(await runAudioBatches(generate, { automatic: true, shouldContinue: () => true, onBatch, wait: async () => {}, now: () => 0 })).toBe('error');
  expect(generate).toHaveBeenCalledTimes(3);
  expect(onBatch.mock.calls[0][0].error).toContain('저장된 문장');
});

it('honors stop during retry settling and manual single-batch operation', async () => {
  const generate = vi.fn().mockRejectedValue(new Error('lost'));
  let running = true;
  expect(await runAudioBatches(generate, { automatic: true, shouldContinue: () => running, onBatch: () => {}, wait: async () => { running = false; } })).toBe('paused');
  expect(generate).toHaveBeenCalledTimes(1);
  const h = harness();
  expect(await runAudioBatches(h.generate, { automatic: false, shouldContinue: () => true, onBatch: () => {} })).toBe('manual');
  expect(h.saved).toHaveLength(AUDIO_BATCH_LIMIT);
});

it('reserves time for saving and carries unstarted sentences into the next request', async () => {
  const h = harness();
  let clock = 0;
  const fetcher = vi.fn<typeof fetch>(async () => {
    clock += 23_000;
    return Response.json({ audio_base64: 'SUQz', alignment: { characters: ['가'], character_start_times_seconds: [0], character_end_times_seconds: [.5] } });
  });
  const result = await generateLessonAudio(h.lesson, 1, { key: 'mock', existing: [], fetcher, now: () => clock, deadline: AUDIO_BATCH_BUDGET_MS, save: async () => { clock += 3000; } });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({ generated: 1, remaining: 27, failed: [] });
});

it('does not retry permission/key errors or a successful response with no progress', async () => {
  const generate = vi.fn().mockResolvedValue({ error: '키 없음' });
  expect(await runAudioBatches(generate, { automatic: true, shouldContinue: () => true, onBatch: () => {} })).toBe('error');
  expect(generate).toHaveBeenCalledTimes(1);
  const empty = vi.fn().mockResolvedValue({ result: { generated: 0, skipped: 0, remaining: 20, failed: [] } });
  expect(await runAudioBatches(empty, { automatic: true, shouldContinue: () => true, onBatch: () => {} })).toBe('no-progress');
  expect(empty).toHaveBeenCalledTimes(1);
});
