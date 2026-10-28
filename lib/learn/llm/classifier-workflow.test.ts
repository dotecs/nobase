import { describe,it,expect,vi } from 'vitest';
import { extractDrafts } from './authoring';
import { MockProvider } from './mock';
const abilities=[{id:'04-3',name:'분수 덧셈',action:'더한다'},{id:'04-6',name:'분수 혼합 계산',action:'계산한다'},{id:'04-5',name:'분수 나눗셈',action:'나눈다'}];
const source='00000000-0000-4000-8000-000000000001';
describe('extraction with auxiliary classifier',()=>{
  it.each([.99,.59])('success confidence %s keeps confidence gate and rule evidence',async confidence=>{
    const classify=vi.fn().mockResolvedValue({choice:'04-6',confidence,probabilities:{'04-6':confidence,'04-3':1-confidence},top2:[{id:'04-6',p:confidence},{id:'04-3',p:1-confidence}],model:'jev-latest',input_tokens:1300,latency_ms:189});
    const provider=Object.assign(new MockProvider(),{classifier:{auto_threshold:.9,classify}});
    const [draft]=await extractDrafts(source,{},provider,abilities);
    expect(draft.ability_candidates).toEqual(['04-6','04-3']);expect(draft.ability_id).toBe(confidence>=.9?'04-6':null);
    expect(draft.extract).toMatchObject({rule:['04-3','04-5'],classifier:{choice:'04-6',confidence,error:null,input_tokens:1300}});expect(classify.mock.calls[0][0].abilities).toEqual(abilities);
  });
  it('classifier failure preserves extraction and rule default',async()=>{const provider=Object.assign(new MockProvider(),{classifier:{auto_threshold:.9,classify:vi.fn().mockRejectedValue(new Error('timeout'))}});const [draft]=await extractDrafts(source,{},provider,abilities);expect(draft).toMatchObject({ability_id:'04-3',ability_candidates:['04-3','04-5'],status:'extracted',extract:{classifier:{error:'timeout'}}});});
  it('disabled classifier keeps existing rule behavior',async()=>{const [draft]=await extractDrafts(source,{},Object.assign(new MockProvider(),{classifier:null}),abilities);expect(draft.ability_id).toBe('04-3');expect(draft.extract).not.toHaveProperty('classifier');});
});
