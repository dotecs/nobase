import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { runtimeTestDb,testUser } from './runtime-test-db';
const mock=vi.hoisted(()=>({client:null as unknown}));
vi.mock('next/headers',()=>({}));
vi.mock('@/lib/supabase-admin',()=>({createAdminSupabaseClient:()=>mock.client}));
vi.mock('@/lib/supabase-server',()=>({createServerSupabaseClient:async()=>mock.client}));
vi.mock('./access',()=>({hasLearnAccess:async()=>({granted:true})}));
describe('coach runtime transactions with mock database',()=>{
  let db:ReturnType<typeof runtimeTestDb>;
  beforeEach(()=>{vi.resetModules();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));db=runtimeTestDb();mock.client=db.client;});
  afterEach(()=>vi.useRealTimers());
  const input=(kind:string,extra:Record<string,unknown>={})=>({kind,userId:testUser,requestId:randomUUID(),eventAt:new Date().toISOString(),note:'[TEST] reviewed',...extra});
  it('diagnostic to gate approval opens active with one decision on retry',async()=>{
    const r=await import('./diagnostic-runtime'),c=await import('./coach-actions');const id=await r.startDiagnosticRuntime();vi.advanceTimersByTime(15*60000);await r.expireDiagnosticRuntime(id);
    const before=structuredClone(db.rows('learn_attempts')),value=input('diagnostic_gate');await c.runCoachAction(value);await c.runCoachAction(value);
    expect(db.rows('learn_learners')[0].status).toBe('active');expect(db.rows('learn_coach_decisions')).toHaveLength(1);expect(db.rows('learn_attempts')).toEqual(before);
    const view=await (await import('./coach-runtime')).learnerDetail(testUser);expect(view.states).toHaveLength(24);expect(view.preview).toHaveLength(2);
  });
  it('partial saves once, preserves original attempt, adds assisted evidence',async()=>{
    const r=await import('./diagnostic-runtime'),c=await import('./coach-actions');const session=await r.startDiagnosticRuntime(),id=randomUUID();
    db.rows('learn_attempts').push({id,user_id:testUser,session_id:session,item_id:'01-4-0',item_version:1,ability_id:'01-4',usage:'diagnostic',result:'pending_review',auto_grade:{solver:'mathcheck'},created_at:new Date().toISOString()});
    const before=structuredClone(db.rows('learn_attempts')),value=input('review_attempt',{attemptId:id,verdict:'partial'});await c.runCoachAction(value);await c.runCoachAction(value);
    expect(db.rows('learn_coach_reviews')).toHaveLength(1);expect(db.rows('learn_attempts')).toEqual(before);expect(db.rows('learn_ability_states').find(row=>row.ability_id==='01-4')?.evidence).toMatchObject({assisted:1,independent_correct:0,incorrect:0});
  });
  it('manual override requires note and records rule version',async()=>{const r=await import('./diagnostic-runtime'),c=await import('./coach-actions');await r.startDiagnosticRuntime();await expect(c.runCoachAction(input('state_override',{abilityId:'01-4',state:'verified',note:''}))).rejects.toThrow('사유');await c.runCoachAction(input('state_override',{abilityId:'01-4',state:'verified'}));expect(db.rows('learn_ability_states').find(row=>row.ability_id==='01-4')).toMatchObject({state:'verified',rule_version:{evidence:2}});expect(db.rows('learn_review_schedule')).toHaveLength(3);});
  it('reset preserves attempts and sessions and permits a new diagnostic',async()=>{const r=await import('./diagnostic-runtime'),c=await import('./coach-actions');const first=await r.startDiagnosticRuntime();const reset=input('restart_diagnostic');await c.runCoachAction(reset);await c.runCoachAction(reset);expect(db.rows('learn_learners')[0].status).toBe('diagnostic_pending');vi.advanceTimersByTime(1000);expect(await r.startDiagnosticRuntime()).not.toBe(first);expect(db.rows('learn_sessions')).toHaveLength(2);});
  it('student role cannot save coach decisions or view learner data',async()=>{db.rows('profiles')[0].role='student';const c=await import('./coach-actions');await expect(c.runCoachAction(input('diagnostic_gate'))).rejects.toThrow('관리자');await expect((await import('./coach-runtime')).learnerList()).rejects.toThrow('관리자');expect(db.rows('learn_coach_decisions')).toHaveLength(0);});
});
