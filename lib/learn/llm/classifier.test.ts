import { afterEach,describe,it,expect,vi } from 'vitest';
vi.mock('next/headers',()=>({}));
import { classifyAbility,configuredClassifier } from './classifier';
const input={stem_md:'$x=-2$일 때 $3x+5$',abilities:[{id:'02-5',name:'대입',action:'식을 계산한다'},{id:'05-3',name:'방정식',action:'해를 구한다'}]};
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
describe('TypeSafe adapter',()=>{
  it('parses response and derives top2 from DB criteria',async()=>{const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({answers:{ability:{choice:'02-5',confidence:.99,probabilities:{'05-3':.01,'02-5':.99}}},usage:{input_tokens:1300},model:'jev-latest'})});vi.stubGlobal('fetch',fetch);const out=await classifyAbility(input,'jev-latest','test-only');expect(out).toMatchObject({choice:'02-5',confidence:.99,top2:[{id:'02-5',p:.99},{id:'05-3',p:.01}],input_tokens:1300});const body=JSON.parse(fetch.mock.calls[0][1].body);expect(body.questions.ability.criteria['02-5']).toBe('대입 — 식을 계산한다');expect(out.latency_ms).toBeGreaterThanOrEqual(0);});
  it('rejects malformed schema without retry',async()=>{const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({answers:{ability:{choice:'02-5',confidence:'high'}}})});vi.stubGlobal('fetch',fetch);await expect(classifyAbility(input,'jev-latest','test-only')).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);});
  it('aborts at five seconds without retry',async()=>{vi.useFakeTimers();const fetch=vi.fn((_url,options)=>new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')))));vi.stubGlobal('fetch',fetch);const promise=classifyAbility(input,'jev-latest','test-only');const assertion=expect(promise).rejects.toThrow('aborted');await vi.advanceTimersByTimeAsync(5000);await assertion;expect(fetch).toHaveBeenCalledTimes(1);});
  it('does not use classifier without key, explicit enablement, or with enabled false',()=>{expect(configuredClassifier({enabled:true},'')).toBeNull();expect(configuredClassifier({},'test-only')).toBeNull();expect(configuredClassifier({enabled:false},'test-only')).toBeNull();});
});
