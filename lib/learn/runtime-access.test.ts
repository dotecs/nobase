import {it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({access:vi.fn(),getUser:vi.fn()}));
vi.mock('@/lib/supabase-server',()=>({createServerSupabaseClient:async()=>({auth:{getUser:mocks.getUser}})}));
vi.mock('./access',()=>({hasLearnAccess:mocks.access}));
import {requireLearnerAccess,requireLearner} from './runtime';
beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:'user'}}});});
it.each(['admin','enrolled'])('returns the existing %s access decision with one access query',async reason=>{mocks.access.mockResolvedValue({granted:true,reason});expect(await requireLearnerAccess()).toEqual({user:{id:'user'},access:{granted:true,reason}});expect(mocks.access).toHaveBeenCalledExactlyOnceWith('user');expect(mocks.getUser).toHaveBeenCalledTimes(1);});
it('keeps the original requireLearner return shape',async()=>{mocks.access.mockResolvedValue({granted:true,reason:'enrolled'});expect(await requireLearner()).toEqual({id:'user'});expect(mocks.access).toHaveBeenCalledTimes(1);});
it('still rejects missing or unregistered users',async()=>{mocks.access.mockResolvedValue({granted:false,reason:'not_enrolled'});await expect(requireLearnerAccess()).rejects.toThrow('코칭 과정 등록');mocks.getUser.mockResolvedValue({data:{user:null}});mocks.access.mockClear();await expect(requireLearnerAccess()).rejects.toThrow('코칭 과정 등록');expect(mocks.access).not.toHaveBeenCalled();});
