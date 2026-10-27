import 'next/headers';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import type { Database } from '@/lib/database.types';
import { requireCoach, learnerRow, runtimePack, runtimeConfigs, type Learner, type Session, type AttemptRow, type StateRow } from './runtime';
import { loadLearnItems } from './items';
import { previewSessions } from './coach';
import type { Attempt, Evidence } from './rules/types';
import type { ReviewSchedule } from './rules/review';
type Table=keyof Database['public']['Tables'];
export async function coachRows<T>(table:Table,userId?:string):Promise<T[]> {
  const client=createAdminSupabaseClient(),rows:T[]=[],size=500;
  for(let offset=0;;offset+=size){let query=client.from(table).select('*');if(userId)query=query.eq('user_id',userId);const result=await query.order(table==='learn_ability_states'?'ability_id':table==='profiles'||table==='learn_learners'?'user_id':'id').range(offset,offset+size-1);if(result.error)throw result.error;const batch=(result.data??[]) as unknown as T[];rows.push(...batch);if(batch.length<size)return rows;}
}
export async function learnerList() {
  await requireCoach();
  const [learners,profiles,attempts,sessions,reviews]=await Promise.all([coachRows<Learner>('learn_learners'),coachRows<{user_id:string;name:string|null}>('profiles'),coachRows<AttemptRow>('learn_attempts'),coachRows<Session>('learn_sessions'),coachRows<{attempt_id:string}>('learn_coach_reviews')]);
  const reviewed=new Set(reviews.map(row=>row.attempt_id));
  return learners.map(learner=>({...learner,name:profiles.find(row=>row.user_id===learner.user_id)?.name??learner.user_id,last_activity:[...attempts.filter(row=>row.user_id===learner.user_id).map(row=>row.created_at),...sessions.filter(row=>row.user_id===learner.user_id).map(row=>row.started_at)].sort().at(-1)??null,pending_photos:attempts.filter(row=>row.user_id===learner.user_id&&row.photo_path&&row.result==='pending_review'&&!reviewed.has(row.id)).length}));
}
export async function learnerDetail(userId:string) {
  await requireCoach();z.uuid().parse(userId);
  const learner=await learnerRow(userId),pack=await runtimePack(learner),config=await runtimeConfigs(),client=createAdminSupabaseClient();
  const [states,attempts,sessions,reviews,schedules,profile]=await Promise.all([coachRows<StateRow>('learn_ability_states',userId),coachRows<AttemptRow>('learn_attempts',userId),coachRows<Session>('learn_sessions',userId),coachRows<Database['public']['Tables']['learn_coach_reviews']['Row']>('learn_coach_reviews'),coachRows<ReviewSchedule>('learn_review_schedule',userId),client.from('profiles').select('name').eq('user_id',userId).single()]);
  const items=await loadLearnItems(pack.abilities.map(row=>row.id));
  const history:Attempt[]=attempts.map(row=>({id:row.id,item_id:row.item_id,item_version:row.item_version,ability_id:row.ability_id,variant_group:items.find(item=>item.id===row.item_id)?.variant_group??row.item_id,result:row.result,usage:row.usage,at:row.created_at}));
  const preview=previewSessions({goal_id:learner.goal_id,status:learner.status,now:new Date().toISOString(),due_reviews:schedules},states.map(row=>({...row,evidence:row.evidence as unknown as Evidence})),pack,items,history,config);
  const timeline=await Promise.all(attempts.map(async row=>{
    const exact=await client.from('learn_items').select('stem_md').eq('id',row.item_id).eq('version',row.item_version).single();
    const signed=row.photo_path?await client.storage.from('learn-evidence').createSignedUrl(row.photo_path,300):null;
    return {...row,stem_md:(exact.data as {stem_md:string}|null)?.stem_md??row.item_id,photo_url:signed?.data?.signedUrl??null,review:reviews.find(review=>review.attempt_id===row.id)??null};
  }));
  return {learner,name:(profile.data as {name:string|null}|null)?.name??userId,pack,states,timeline,sessions,preview,items};
}
