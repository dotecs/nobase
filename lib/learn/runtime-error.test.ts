import { afterEach,describe,expect,it,vi } from 'vitest';
vi.mock('next/headers',()=>({}));
vi.mock('@/lib/supabase-admin',()=>({createAdminSupabaseClient:vi.fn()}));
vi.mock('@/lib/supabase-server',()=>({createServerSupabaseClient:vi.fn()}));
import { runtimeError } from './runtime';
afterEach(()=>vi.restoreAllMocks());
describe('runtime error boundary',()=>{
  it('logs the original error and location without exposing details to the user',()=>{
    const log=vi.spyOn(console,'error').mockImplementation(()=>{}),error=new Error('Insufficient followup items: 02-4');
    expect(runtimeError(error,'submitAttempt')).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect(log).toHaveBeenCalledExactlyOnceWith('[learn]',{where:'submitAttempt',message:error.message,stack:error.stack});
  });
  it('logs plain database errors with the same safe response',()=>{
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    expect(runtimeError({code:'42P01',message:'relation learn_secret missing'},'learningView')).not.toMatch(/42P01|learn_secret|046/);
    expect(log).toHaveBeenCalledExactlyOnceWith('[learn]',{where:'learningView',message:'relation learn_secret missing',stack:null});
  });
  it('handles non-Error throws',()=>{const log=vi.spyOn(console,'error').mockImplementation(()=>{});expect(runtimeError(null,'startSession')).toContain('다시 시도');expect(log).toHaveBeenCalledWith('[learn]',{where:'startSession',message:'null',stack:null});});
});
