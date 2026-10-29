import { readFileSync } from 'node:fs';
import { beforeEach,describe,it,expect,vi } from 'vitest';
import { runtimeTestDb,testUser } from './runtime-test-db';
const mock=vi.hoisted(()=>({client:null as unknown}));
vi.mock('next/headers',()=>({}));
vi.mock('@/lib/supabase-admin',()=>({createAdminSupabaseClient:()=>mock.client}));
vi.mock('@/lib/supabase-server',()=>({createServerSupabaseClient:async()=>mock.client}));
vi.mock('./access',()=>({hasLearnAccess:async()=>({granted:true})}));
const id='00000000-0000-4000-8000-000000000099';
describe('session photo evidence',()=>{
  let db:ReturnType<typeof runtimeTestDb>;
  beforeEach(()=>{vi.resetModules();db=runtimeTestDb();db.rows('learn_sessions').push({id,user_id:testUser,kind:'diagnostic',ended_at:new Date().toISOString()});
    mock.client={...db.client,rpc:async(_name:string,p:{p_user_id:string;p_session_id:string;p_path:string})=>{
      const rows=db.rows('learn_session_photos'),existing=rows.find(row=>row.path===p.p_path);if(existing)return {data:existing.id,error:null};
      if(rows.length>=4)return {data:null,error:{message:'사진은 4장까지 올릴 수 있어요'}};
      rows.push({id:String(rows.length),session_id:p.p_session_id,user_id:p.p_user_id,path:p.p_path,position:rows.length});return {data:'photo',error:null};
    }};
  });
  const input=(n=0)=>({sessionId:id,path:`${testUser}/sessions/${id}/${n}.png`});
  it('rejects a foreign session and an unfinished session',async()=>{const {addSessionPhotoRuntime:add}=await import('./session-photos');db.rows('learn_sessions')[0].user_id='other';await expect(add(input())).rejects.toBeTruthy();db.rows('learn_sessions')[0].user_id=testUser;db.rows('learn_sessions')[0].ended_at=null;await expect(add(input())).rejects.toThrow('마친 뒤');expect(db.rows('learn_session_photos')).toHaveLength(0);});
  it('rejects wrong owner, session directory and traversal paths',async()=>{const {addSessionPhotoRuntime:add}=await import('./session-photos');for(const path of ['other/sessions/x/p.png',`${testUser}/sessions/other/p.png`,`${testUser}/sessions/${id}/../p.png`])await expect(add({...input(),path})).rejects.toThrow('경로');});
  it('allows four distinct photos and idempotent retries, rejects a fifth',async()=>{const {addSessionPhotoRuntime:add}=await import('./session-photos');for(let n=0;n<4;n++)await add(input(n));expect(await add(input())).toHaveLength(4);await expect(add(input(4))).rejects.toThrow('사진은 4장');expect(db.rows('learn_session_photos')).toHaveLength(4);});
  it('signed photos require owner access or admin role',async()=>{db.rows('profiles')[0].role='student';db.rows('learn_sessions')[0].user_id='other';await expect((await import('./session-photos')).sessionPhotos(id)).rejects.toThrow('관리자');});
  it('never signs another storage owner path even if a row is malformed',async()=>{db.rows('learn_session_photos').push({session_id:id,user_id:testUser,path:'other/sessions/secret.png'});await expect((await import('./session-photos')).sessionPhotos(id)).rejects.toThrow('사진 경로');});
  it.each([['student',true,true],['admin',false,true],['student',false,false]] as const)('click signing checks %s owner=%s',async(role,owner,allowed)=>{const photoId='00000000-0000-4000-8000-000000000088',userId=owner?testUser:'other';db.rows('profiles')[0].role=role;db.rows('learn_sessions')[0].user_id=userId;db.rows('learn_session_photos').push({id:photoId,session_id:id,user_id:userId,path:userId+'/sessions/'+id+'/photo.jpg',position:0});const sign=vi.fn(async()=>({data:{signedUrl:'fresh-url'},error:null}));mock.client={...db.client,storage:{from:()=>({createSignedUrl:sign})}};const {signedSessionPhotoUrlRuntime:get}=await import('./session-photos');if(allowed){expect(await get(photoId)).toBe('fresh-url');expect(sign).toHaveBeenCalledWith(userId+'/sessions/'+id+'/photo.jpg',300);}else{await expect(get(photoId)).rejects.toThrow('관리자');expect(sign).not.toHaveBeenCalled();}});
  it('reminder picks the latest missing-photo session within 24 hours',async()=>{const now=Date.now();db.rows('learn_sessions').push(...[1,2,30].map(hours=>({id:'practice-'+hours,user_id:testUser,kind:'practice',started_at:new Date(now-hours*3600000).toISOString(),ended_at:new Date(now-hours*3600000).toISOString()})));db.rows('learn_session_photos').push({session_id:'practice-1',path:'has.png'});const pending=await (await import('./session-photos')).pendingPhotoSessions(testUser);expect(pending.learning?.id).toBe('practice-2');expect(pending.diagnosticPending?.id).toBe(id);});
  it('SQL locks the session before counting and restricts execute to service role',()=>{const sql=readFileSync('supabase/migrations/057_learn_session_photos.sql','utf8');expect(sql.indexOf('for update')).toBeLessThan(sql.indexOf('select count(*)'));for(const text of ['security invoker','from public, anon, authenticated','to service_role','if found then return photo_id','photo_count>=4'])expect(sql).toContain(text);expect(sql).not.toMatch(/storage\.|for all|for delete/i);});
});
