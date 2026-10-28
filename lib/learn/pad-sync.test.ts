import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import { createPadSync,padConnectionLabel } from './pad-sync';
import type { PadDraft,PadSnapshot } from './pad-draft';
const draft:PadDraft={answer:'3',steps:['x=3'],photo_path:null,source:'pad'};
const snapshot:PadSnapshot={draft,updated_at:'2026-10-28T00:00:01Z',plan_index:0,ended:false};
describe('two-device polling',()=>{
  beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
  function setup(){const options={source:'screen' as const,planIndex:0,read:vi.fn(async()=>snapshot),save:vi.fn<(draft:PadDraft)=>Promise<{updated_at:string}>>(async()=>({updated_at:'2026-10-28T00:00:03Z'})),onDraft:vi.fn(),onProgress:vi.fn(),onStatus:vi.fn(),onError:vi.fn()};return {options,sync:createPadSync(options)};}
  it('polls at two seconds and applies answer, steps and photo together',async()=>{
    const {options,sync}=setup();await vi.advanceTimersByTimeAsync(1999);expect(options.read).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(1);expect(options.onDraft).toHaveBeenCalledWith(draft);sync.stop();
  });
  it('debounces rapid edits for 300ms and sends only the latest draft',async()=>{
    const {options,sync}=setup();sync.edit({...draft,source:'screen',answer:'1'});await vi.advanceTimersByTimeAsync(200);sync.edit({...draft,source:'screen',answer:'2'});await vi.advanceTimersByTimeAsync(299);expect(options.save).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(1);expect(options.save).toHaveBeenCalledOnce();expect(options.save.mock.calls[0][0].answer).toBe('2');sync.stop();
  });
  it('never overwrites a newer local edit with an older poll response',async()=>{
    const {options,sync}=setup();let resolve!:(s:PadSnapshot)=>void;options.read.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
    await vi.advanceTimersByTimeAsync(2000);sync.edit({...draft,source:'screen',answer:'7'});resolve(snapshot);await vi.advanceTimersByTimeAsync(0);expect(options.onDraft).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);expect(options.onDraft).not.toHaveBeenCalled();sync.stop();
  });
  it.each([{plan_index:1,ended:false},{plan_index:0,ended:true}])('refreshes for progress %j even without a draft',async progress=>{
    const {options,sync}=setup();options.read.mockResolvedValue({...progress,draft:null,updated_at:null});await vi.advanceTimersByTimeAsync(2000);expect(options.onProgress).toHaveBeenCalledOnce();expect(options.onDraft).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(4000);expect(options.read).toHaveBeenCalledOnce();sync.stop();
  });
  it('flushes a pending edit before submission and stops polling after cleanup',async()=>{
    const {options,sync}=setup();sync.edit(draft);await sync.flush();expect(options.save).toHaveBeenCalledOnce();sync.stop();await vi.advanceTimersByTimeAsync(5000);expect(options.read).not.toHaveBeenCalled();
  });
  it('connection label goes idle after sixty seconds',()=>{
    expect(padConnectionLabel('2026-10-28T00:00:00Z',Date.parse('2026-10-28T00:00:03Z'))).toBe('폰에서 입력 중 · 3초 전');
    expect(padConnectionLabel('2026-10-28T00:00:00Z',Date.parse('2026-10-28T00:01:00Z'))).toBe('폰 연결 대기');expect(padConnectionLabel(null,0)).toBe('폰 연결 대기');
  });
});
