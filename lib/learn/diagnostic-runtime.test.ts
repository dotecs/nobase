import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { runtimeTestDb, testUser } from './runtime-test-db';
const mock=vi.hoisted(()=>({client:null as unknown,access:true}));
vi.mock('next/headers',()=>({}));
vi.mock('@/lib/supabase-admin',()=>({createAdminSupabaseClient:()=>mock.client}));
vi.mock('@/lib/supabase-server',()=>({createServerSupabaseClient:async()=>mock.client}));
vi.mock('./access',()=>({hasLearnAccess:async()=>({granted:mock.access})}));
describe('diagnostic server flow with mock service database',()=>{
  let db:ReturnType<typeof runtimeTestDb>;
  beforeEach(()=>{vi.resetModules();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));db=runtimeTestDb();mock.client=db.client;mock.access=true;});
  afterEach(()=>vi.useRealTimers());
  it('six answers finish with 24 states and coach gate; response has no grading data',async()=>{
    const runtime=await import('./diagnostic-runtime');await runtime.startDiagnosticRuntime();
    for(let i=0;i<6;i++){const view=await runtime.diagnosticView();if(!view||view.complete)throw new Error('Expected item');expect(JSON.stringify(view)).not.toMatch(/answer_spec|auto_grade|correct_independent|rule_version/);await runtime.submitDiagnosticRuntime({sessionId:view.sessionId,itemId:view.item.id,planIndex:view.planIndex,answer:'1',photoPath:`${testUser}/attempts/proof.png`,durationMs:1000});}
    expect(await runtime.diagnosticView()).toEqual({complete:true});expect(db.rows('learn_sessions')).toHaveLength(1);expect(db.rows('learn_attempts')).toHaveLength(6);expect(db.rows('learn_ability_states')).toHaveLength(24);expect(db.rows('learn_learners')[0].status).toBe('awaiting_coach');expect(db.rows('learn_sessions')[0].ended_at).not.toBeNull();
  });
  it('gate false opens active automatically',async()=>{(db.rows('learn_rule_configs').find(row=>row.key==='gate')!.config as {coach_gate_after_diagnostic:boolean}).coach_gate_after_diagnostic=false;const r=await import('./diagnostic-runtime');const id=await r.startDiagnosticRuntime();vi.advanceTimersByTime(15*60000);await r.expireDiagnosticRuntime(id);expect(db.rows('learn_learners')[0].status).toBe('active');expect(db.rows('learn_attempts').every(row=>row.result==='no_response')).toBe(true);});
  it('refresh resumes and duplicate submission creates only one attempt',async()=>{const r=await import('./diagnostic-runtime');expect(await r.startDiagnosticRuntime()).toBe(await r.startDiagnosticRuntime());const v=await r.diagnosticView();if(!v||v.complete)throw new Error('Expected item');const input={sessionId:v.sessionId,itemId:v.item.id,planIndex:v.planIndex,answer:'0',photoPath:`${testUser}/attempts/p.png`,durationMs:1};await r.submitDiagnosticRuntime(input);await r.submitDiagnosticRuntime(input);expect(db.rows('learn_attempts')).toHaveLength(1);const resumed=await r.diagnosticView();expect(resumed&&!resumed.complete&&resumed.item.ability_id).toBe('01-3');});
  it('missing photo or foreign path does not create an attempt',async()=>{const r=await import('./diagnostic-runtime');await r.startDiagnosticRuntime();const v=await r.diagnosticView();if(!v||v.complete)throw new Error('Expected item');for(const photoPath of [null,'other/attempts/p.png'])await expect(r.submitDiagnosticRuntime({sessionId:v.sessionId,itemId:v.item.id,planIndex:v.planIndex,answer:'1',photoPath,durationMs:1})).rejects.toThrow();expect(db.rows('learn_attempts')).toHaveLength(0);});
  it('access denial prevents service writes',async()=>{mock.access=false;const r=await import('./diagnostic-runtime');await expect(r.startDiagnosticRuntime()).rejects.toThrow('등록');expect(db.rows('learn_sessions')).toHaveLength(0);});
});
