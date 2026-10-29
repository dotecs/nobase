import { beforeEach,describe,it,expect,vi } from 'vitest';
const mock=vi.hoisted(()=>({signOut:vi.fn()}));
vi.mock('@/lib/supabase-client',()=>({createClientSupabaseClient:()=>({auth:{signOut:mock.signOut}})}));
import { signOutLocal } from './logout';
describe('device-local sign out',()=>{
  beforeEach(()=>mock.signOut.mockReset());
  it('signs out only the current device',async()=>{mock.signOut.mockResolvedValue({error:null});await signOutLocal();expect(mock.signOut).toHaveBeenCalledExactlyOnceWith({scope:'local'});});
  it('propagates failures so the UI stays on the page',async()=>{const error=new Error('network');mock.signOut.mockResolvedValue({error});await expect(signOutLocal()).rejects.toBe(error);});
});
