import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const hooks = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[] }));
vi.mock('react', () => ({
  useState: (initial: unknown) => { const index = hooks.cursor++; if (!(index in hooks.slots)) hooks.slots[index] = initial; return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = typeof value === 'function' ? (value as (old: unknown) => unknown)(hooks.slots[index]) : value; }]; },
  useRef: (initial: unknown) => { const index = hooks.cursor++; return hooks.slots[index] ?? (hooks.slots[index] = { current: initial }); },
  useCallback: (callback: unknown) => callback,
  useEffect: () => {},
}));
import { useLessonCompletion } from '@/components/studio/useLessonCompletion';
import { useLessonEvents } from '@/components/studio/useLessonEvents';

beforeEach(() => { hooks.cursor = 0; hooks.slots = []; vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
it('completes once automatically, supports closing/reopening, and never reopens automatically after replay', () => {
  const record = vi.fn();
  const Harness = () => { hooks.cursor = 0; return useLessonCompletion(record); };
  Harness().onEnded();
  expect(Harness()).toMatchObject({ completed: true, open: true });
  Harness().close();
  Harness().onEnded();
  expect(Harness().open).toBe(false);
  Harness().show();
  expect(Harness().open).toBe(true);
  expect(record).toHaveBeenCalledTimes(1);
});
it('records a manual completion once even if playback ends at the same time', () => {
  const record = vi.fn(), completion = useLessonCompletion(record);
  completion.show();
  completion.onEnded();
  completion.show();
  expect(record).toHaveBeenCalledTimes(1);
});
it('awaits an in-flight event batch and the queued completion before navigation', async () => {
  let release!: (result: {error?:string}) => void;
  const record = vi.fn().mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockResolvedValue({});
  const events = useLessonEvents(record);
  events.emit({ type: 'scene', payload: {} });
  const first = events.flush();
  await Promise.resolve();
  events.emit({ type: 'complete', payload: {} });
  let finished = false;
  const final = events.flush().then(() => { finished = true; });
  expect(finished).toBe(false);
  release({});
  await first;
  await final;
  expect(record).toHaveBeenCalledTimes(2);
  expect(record.mock.calls.flatMap(([batch]) => batch).filter(event => event.type === 'complete')).toHaveLength(1);
  expect(finished).toBe(true);
});
