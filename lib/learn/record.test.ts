import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ role: 'service_role', user: 'u', ended: false, attempts: new Map<string, string>(), writes: [] as string[], fail: false }));
vi.mock('next/headers', () => ({}));
vi.mock('@/lib/supabase-admin', () => ({ createAdminSupabaseClient: () => ({ rpc: async (name: string, {p_payload: p}: {p_payload: {user_id:string; idempotency_key:string}}) => {
  if (name !== 'learn_record_attempt') throw new Error('Unexpected RPC');
  if (db.role !== 'service_role' || p.user_id !== db.user || db.ended) return {data:null,error:new Error('Invalid active session')};
  if (db.attempts.has(p.idempotency_key)) return {data:db.attempts.get(p.idempotency_key),error:null};
  if (db.fail) return {data:null,error:new Error('Transaction rejected')};
  const id = '00000000-0000-4000-8000-000000000001'; db.attempts.set(p.idempotency_key,id); db.writes.push('attempt','state','event','reviews','plan');
  return {data:id,error:null};
} }) }));
import { recordAttempt, type RecordPayload } from './record';
const payload = () => ({idempotency_key:'s:i:0',session_id:'s',user_id:'u',attempt:{item_id:'i',item_version:1,ability_id:'a',usage:'diagnostic',answer_input:'1',result:'correct_independent',auto_grade:{},rule_version:{solvers:1}},state:null,event:null,reviews:[],review_updates:[],session_plan_append:null,learner_status:null}) as RecordPayload;
function reset() { db.role='service_role';db.user='u';db.ended=false;db.fail=false;db.attempts.clear();db.writes=[]; }
describe('attempt persistence RPC contract', () => {
  it('same key twice returns one existing attempt', async () => { reset(); expect(await recordAttempt(payload())).toBe(await recordAttempt(payload())); expect(db.attempts.size).toBe(1); expect(db.writes).toEqual(['attempt','state','event','reviews','plan']); });
  it.each(['owner','closed','role','failure'])('%s failure leaves no writes', async mode => { reset(); if(mode==='owner')db.user='other';if(mode==='closed')db.ended=true;if(mode==='role')db.role='authenticated';if(mode==='failure')db.fail=true;await expect(recordAttempt(payload())).rejects.toThrow();expect(db.attempts.size).toBe(0); });
  it('SQL enforces invoker role, ownership, lock and duplicate ordering', () => {
    const sql = readFileSync('supabase/migrations/047_learn_record_attempt.sql','utf8');
    for(const text of ['security invoker',"auth.role() is distinct from 'service_role'",'session.user_id is distinct from owner_id','session.ended_at is not null','for update','if found then return attempt_id','from public, anon, authenticated','to service_role','unique index learn_attempts_idempotency_idx']) expect(sql).toContain(text);
    expect(sql.indexOf('for update')).toBeLessThan(sql.indexOf('if found then return attempt_id'));
    expect(sql.indexOf('if found then return attempt_id')).toBeLessThan(sql.indexOf('insert into public.learn_attempts'));
    expect(sql).not.toMatch(/\b(drop|truncate)\b|delete\s+from|alter\s+column.*\btype\b/i);
  });
});
