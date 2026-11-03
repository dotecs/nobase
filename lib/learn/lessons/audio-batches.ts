import type { AudioGenerationResult } from './audio';
import { AUDIO_RETRY_SETTLE_MS } from './audio-batch-settings';
export type AudioBatchResponse = { result?: AudioGenerationResult; error?: string };
export type AudioBatchStop = 'complete' | 'paused' | 'manual' | 'no-progress' | 'error' | 'no-key';

type BatchOptions = {
  automatic: boolean;
  shouldContinue: () => boolean;
  onBatch: (response: AudioBatchResponse, index: number) => void;
  onRetry?: (attempt: number) => void;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
};

async function waitToRetry(ms: number, shouldContinue: () => boolean) {
  const end = Date.now() + ms;
  while (shouldContinue() && Date.now() < end) {
    await new Promise(resolve => setTimeout(resolve, Math.min(500, end - Date.now())));
  }
}

export async function runAudioBatches(generate: () => Promise<AudioBatchResponse>, options: BatchOptions): Promise<AudioBatchStop> {
  let previous = Infinity, index = 0, retries = 0;
  const now = options.now ?? Date.now;
  while (options.shouldContinue()) {
    const started = now();
    let response: AudioBatchResponse;
    try {
      response = await generate();
      retries = 0;
    } catch {
      if (!options.automatic || retries >= 2) {
        options.onBatch({ error: '배치 응답을 받지 못했습니다. 저장된 문장은 다음 시작에서 자동으로 건너뜁니다.' }, ++index);
        return 'error';
      }
      retries++;
      options.onRetry?.(retries);
      // The old action may still be saving. Let its server deadline expire first.
      const delay = Math.max(1000, AUDIO_RETRY_SETTLE_MS - (now() - started));
      await (options.wait ?? (ms => waitToRetry(ms, options.shouldContinue)))(delay);
      continue;
    }
    options.onBatch(response, ++index);
    const result = response.result;
    if (response.error || !result) return 'error';
    if (result.noKey) return 'no-key';
    if (result.remaining === 0) return 'complete';
    if (!options.automatic) return 'manual';
    if (result.generated + (result.reused ?? 0) + result.failed.length === 0 || result.remaining >= previous) return 'no-progress';
    previous = result.remaining;
  }
  return 'paused';
}

export function audioBatchMessage(response: AudioBatchResponse, index: number) {
  const result = response.result;
  return '배치 ' + index + ' · ' + (response.error ?? (result?.noKey ? '키 없음' : result
    ? '생성 ' + result.generated + ' · 재사용 ' + (result.reused ?? 0) + ' · 기존 ' + result.skipped + ' · 남음 ' + result.remaining + (result.failed.length ? ' · 실패: ' + result.failed.map(f => f.sentence_id).join(', ') : '')
    : '결과를 확인하지 못했습니다.'));
}
