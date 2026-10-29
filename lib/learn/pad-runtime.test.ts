import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runtimeTestDb,testUser } from './runtime-test-db';
import { savePadSchema } from './pad-draft';
const mock=vi.hoisted(()=>({client:null as unknown}));
vi.mock('next/headers',()=>({}));
vi.mock('@/lib/supabase-admin',()=>({createAdminSupabaseClient:()=>mock.client}));
vi.mock('@/lib/supabase-server',()=>({createServerSupabaseClient:async()=>mock.client}));
vi.mock('./access',()=>({hasLearnAccess:async()=>({granted:true})}));
describe('pad draft ownership and limits',()=>{
  let db:ReturnType<typeof runtimeTestDb>;
  beforeEach(()=>{vi.resetModules();db=runtimeTestDb();mock.client=db.client;});
  async function setup(){const r=await import('./diagnostic-runtime'),sessionId=await r.startDiagnosticRuntime();return {sessionId,planIndex:0,draft:{answer:'1',steps:['2-1'],photo_path:null,source:'pad' as const}};}
  it('rejects another learner session for reading and writing',async()=>{
    const input=await setup();db.rows('learn_sessions')[0].user_id='other';const r=await import('./pad-runtime');
    await expect(r.savePadDraftRuntime(input)).rejects.toBeTruthy();await expect(r.readPadDraftRuntime(input)).rejects.toBeTruthy();expect(db.rows('learn_pad_drafts')).toHaveLength(0);
  });
  it('rejects drafts above 8KB before writing',async()=>{
    const input=await setup();input.draft.answer='가'.repeat(3000);
    expect(savePadSchema.safeParse(input).success).toBe(false);
    await expect((await import('./pad-runtime')).savePadDraftRuntime(input)).rejects.toBeTruthy();expect(db.rows('learn_pad_drafts')).toHaveLength(0);
  });
  it('missing draft returns null with current progress',async()=>{const input=await setup();expect(await (await import('./pad-runtime')).readPadDraftRuntime(input)).toEqual({session_photo_count:0,draft:null,updated_at:null,plan_index:0,ended:false});});
  it('upserts only the authenticated owner and rejects stale plan index',async()=>{
    const input=await setup(),r=await import('./pad-runtime');await r.savePadDraftRuntime(input);await r.savePadDraftRuntime({...input,draft:{...input.draft,answer:'2'}});
    expect(db.rows('learn_pad_drafts')).toHaveLength(1);expect(db.rows('learn_pad_drafts')[0]).toMatchObject({user_id:testUser,draft:{answer:'2'}});
    await expect(r.savePadDraftRuntime({...input,planIndex:1})).rejects.toThrow('진행 상태');
  });
  it('rejects foreign photo paths',async()=>{const input=await setup();await expect((await import('./pad-runtime')).savePadDraftRuntime({...input,draft:{...input.draft,photo_path:'other/attempts/p.png'}})).rejects.toThrow('사진 경로');});
  it('returns changed plan index and closed state without needing a saved draft',async()=>{
    const input=await setup(),r=await import('./pad-runtime'),session=db.rows('learn_sessions')[0];
    const plan=session.plan as {type:string;plan_index?:number}[];plan[1].plan_index=1;
    expect(await r.readPadDraftRuntime(input)).toMatchObject({plan_index:1,ended:false,draft:null});session.ended_at=new Date().toISOString();db.rows('learn_session_photos').push({session_id:input.sessionId,path:'test'});
    expect(await r.readPadDraftRuntime(input)).toMatchObject({ended:true,session_photo_count:1});
    await expect(r.savePadDraftRuntime({...input,planIndex:1})).rejects.toThrow('진행 상태');
  });
});
