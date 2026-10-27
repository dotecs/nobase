import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest';
import { runtimeTestDb,testUser } from './runtime-test-db';
import { emptyEvidence } from './rules/types';
const mock=vi.hoisted(()=>({client:null as unknown,access:true}));
vi.mock('next/headers',()=>({}));
vi.mock('@/lib/supabase-admin',()=>({createAdminSupabaseClient:()=>mock.client}));
vi.mock('@/lib/supabase-server',()=>({createServerSupabaseClient:async()=>mock.client}));
vi.mock('./access',()=>({hasLearnAccess:async()=>({granted:mock.access})}));
describe('learning runtime',()=>{
  let db:ReturnType<typeof runtimeTestDb>;
  beforeEach(()=>{vi.resetModules();vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-27T00:00:00Z'));db=runtimeTestDb();mock.client=db.client;mock.access=true;db.rows('learn_learners').push({user_id:testUser,pack_id:'root-math',goal_id:'g-linear-eq-basic',status:'active'});for(const item of db.rows('learn_items'))item.hints=['첫 힌트','두 번째 풀이'];});
  afterEach(()=>vi.useRealTimers());
  async function start(){const r=await import('./learning-runtime'),s=await r.startLearningRuntime();if(!s.id)throw new Error('Missing session');return {r,id:s.id};}
  async function submit(r:typeof import('./learning-runtime'),id:string,answer='1'){const v=await r.learningView(id);if(v.complete)throw new Error('Expected question');const input={sessionId:id,itemId:v.item.id,planIndex:v.planIndex,answer,photoPath:v.photo_required?`${testUser}/attempts/proof.png`:null,durationMs:100};await r.submitLearningRuntime(input);return input;}
  it('two sessions verify one ability, save three reviews and versioned traces',async()=>{
    (db.rows('learn_rule_configs').find(row=>row.key==='session')!.config as {items_per_session:number}).items_per_session=1;
    for(const row of db.rows('learn_goal_requirements'))if(row.ability_id!=='01-4')db.rows('learn_ability_states').push({user_id:testUser,ability_id:row.ability_id,state:'verified',evidence:emptyEvidence()});
    const {r,id}=await start();await submit(r,id);const second=await r.startLearningRuntime();await submit(r,second.id!);
    expect(db.rows('learn_sessions')).toHaveLength(2);expect(db.rows('learn_ability_states').find(row=>row.ability_id==='01-4')!.state).toBe('verified');expect(db.rows('learn_review_schedule')).toHaveLength(3);
    expect(db.rows('learn_ability_state_events')).toHaveLength(2);for(const event of db.rows('learn_ability_state_events')){expect(event.rule_version).toMatchObject({session:2,evidence:2});expect(JSON.parse(event.reason as string)).toHaveProperty('state');}
    expect(await r.learningView(second.id!)).toMatchObject({complete:true,summary:{correct:1,newly_verified:['01-4']}});
  });
  it('first wrong hides answer; second wrong reveals only submitted answer and explanation',async()=>{const {r,id}=await start();const first=await r.learningView(id);expect(JSON.stringify(first)).not.toMatch(/answer_spec|answer_guess|rubric/);await submit(r,id,'0');expect(await r.learningView(id)).toMatchObject({feedback:{can_retry:true,answer:null,hint:'첫 힌트'}});await submit(r,id,'0');expect(await r.learningView(id)).toMatchObject({feedback:{can_retry:false,answer:'1',explanation:'두 번째 풀이'}});expect(db.rows('learn_attempts')).toHaveLength(2);});
  it('retry correct is assisted and duplicate request is idempotent',async()=>{const {r,id}=await start();expect((await r.startLearningRuntime()).id).toBe(id);await submit(r,id,'0');const input=await submit(r,id);await r.submitLearningRuntime(input);expect(db.rows('learn_attempts')).toHaveLength(2);expect(db.rows('learn_attempts')[1]).toMatchObject({result:'correct_assisted',hints_used:1});});
  it('timeout finishes without attempts for remaining questions',async()=>{const {r,id}=await start();vi.advanceTimersByTime(20*60000);await r.expireLearningRuntime(id);expect(await r.learningView(id)).toMatchObject({complete:true,summary:{timed_out:true,attempts:0}});expect(db.rows('learn_attempts')).toHaveLength(0);});
  it('denied access and paused learner cannot create a session',async()=>{mock.access=false;const r=await import('./learning-runtime');await expect(r.startLearningRuntime()).rejects.toThrow();mock.access=true;db.rows('learn_learners')[0].status='paused';await expect(r.startLearningRuntime()).rejects.toThrow();expect(db.rows('learn_sessions')).toHaveLength(0);});
  it('foreign session is not readable or writable',async()=>{const {r,id}=await start();db.rows('learn_sessions')[0].user_id='other';await expect(r.learningView(id)).rejects.toThrow();expect(db.rows('learn_attempts')).toHaveLength(0);});
});
