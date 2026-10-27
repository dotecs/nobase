import { readFileSync } from 'node:fs';
import { describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({saved:new Map<string,string>(),role:'service_role'}));
vi.mock('next/headers',()=>({}));
vi.mock('@/lib/supabase-admin',()=>({createAdminSupabaseClient:()=>({rpc:async(name:string,{p_payload:p}:{p_payload:{idempotency_key:string}})=>{
  expect(name).toBe('learn_record_coach_action');if(mock.role!=='service_role')return{data:null,error:new Error('Server only')};
  if(!mock.saved.has(p.idempotency_key))mock.saved.set(p.idempotency_key,'00000000-0000-4000-8000-000000000001');return{data:mock.saved.get(p.idempotency_key),error:null};
}})}));
import {recordCoachAction,type CoachPayload} from './record-coach';
describe('coach storage contract',()=>{
  it('same key twice returns one stored action',async()=>{mock.saved.clear();const payload={idempotency_key:'diagnostic_gate:u:s'} as CoachPayload;expect(await recordCoachAction(payload)).toBe(await recordCoachAction(payload));expect(mock.saved.size).toBe(1);});
  it('session clients cannot call storage RPC',async()=>{mock.role='authenticated';await expect(recordCoachAction({} as CoachPayload)).rejects.toThrow('Server only');mock.role='service_role';});
  it('SQL locks learner and checks idempotency before writes',()=>{const sql=readFileSync('supabase/migrations/048_learn_record_coach_action.sql','utf8');for(const text of ['security invoker',"auth.role() is distinct from 'service_role'",'for update','if found then return action_id','from public, anon, authenticated','to service_role','learn_coach_reviews_idempotency_idx','learn_coach_decisions_idempotency_idx'])expect(sql).toContain(text);expect(sql.indexOf('for update')).toBeLessThan(sql.indexOf('if found then return action_id'));expect(sql).not.toMatch(/\b(drop|truncate)\b|delete\s+from|alter\s+column.*\btype\b/i);});
});
