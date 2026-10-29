import { beforeEach,describe,it,expect,vi } from 'vitest';
import { runtimeTestDb,testUser } from './runtime-test-db';
const mock=vi.hoisted(()=>({client:null as unknown}));
vi.mock('next/headers',()=>({}));
vi.mock('@/lib/supabase-admin',()=>({createAdminSupabaseClient:()=>mock.client}));
vi.mock('@/lib/supabase-server',()=>({createServerSupabaseClient:async()=>mock.client}));
describe('admin bypass never auto-enrolls a learner',()=>{
  let db:ReturnType<typeof runtimeTestDb>;
  beforeEach(()=>{db=runtimeTestDb();mock.client=db.client;});
  it('admin access without an actual enrollment performs zero learner inserts',async()=>{const {hasLearnAccess}=await import('./access');expect(await hasLearnAccess(testUser)).toMatchObject({reason:'admin',granted:true});const {learnerRow}=await import('./runtime');await expect(learnerRow(testUser,true)).rejects.toThrow('등록 후');expect(db.rows('learn_learners')).toHaveLength(0);});
  it('an actual active enrollment allows even an admin to use the student flow',async()=>{db.rows('enrollments').push({user_id:testUser,status:'active','cohort.course.slug':'root-math',cohort:{course:{slug:'root-math'}}});await (await import('./runtime')).learnerRow(testUser,true);expect(db.rows('learn_learners')).toHaveLength(1);});
});
