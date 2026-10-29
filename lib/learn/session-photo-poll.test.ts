import { afterEach,beforeEach,describe,it,expect,vi } from 'vitest';
import { pollSessionPhotos } from './session-photo-poll';
describe('completion photo polling',()=>{
  beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
  it('polls ended sessions every two seconds and refreshes only on count change',async()=>{
    const read=vi.fn(async()=>({session_photo_count:0})),onChange=vi.fn(),stop=pollSessionPhotos({count:0,read,onChange,onError:vi.fn()});
    await vi.advanceTimersByTimeAsync(1999);expect(read).not.toHaveBeenCalled();await vi.advanceTimersByTimeAsync(1);expect(onChange).not.toHaveBeenCalled();
    read.mockResolvedValue({session_photo_count:1});await vi.advanceTimersByTimeAsync(2000);expect(onChange).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(2000);expect(onChange).toHaveBeenCalledOnce();stop();const calls=read.mock.calls.length;await vi.advanceTimersByTimeAsync(4000);expect(read).toHaveBeenCalledTimes(calls);
  });
  it('does not refresh after unmount while a request is outstanding',async()=>{let resolve!:(v:{session_photo_count:number})=>void;const onChange=vi.fn(),stop=pollSessionPhotos({count:0,read:()=>new Promise(r=>{resolve=r;}),onChange,onError:vi.fn()});await vi.advanceTimersByTimeAsync(2000);stop();resolve({session_photo_count:1});await vi.advanceTimersByTimeAsync(0);expect(onChange).not.toHaveBeenCalled();});
});
