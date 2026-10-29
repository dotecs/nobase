import 'next/headers';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireLearner,requireCoach,sessionRow,type Session } from './runtime';
import { LearnUserError } from './errors';
export type SessionPhoto={id:string;session_id:string;user_id:string;path:string;position:number;url:string};
/** Caller has authenticated userId; results are never exposed without that guard. */
export async function pendingPhotoSessions(userId:string) {
  const client=createAdminSupabaseClient(),latest=await client.from('learn_sessions').select('*').eq('user_id',userId).eq('kind','diagnostic').order('started_at',{ascending:false}).limit(1);
  if(latest.error)throw latest.error;
  const diagnostic=(latest.data?.[0]??null) as Session|null;
  const diagnosticPending=diagnostic?.ended_at&&(await sessionPhotoRows(diagnostic.id)).length===0?diagnostic:null;
  const recent=await client.from('learn_sessions').select('*').eq('user_id',userId).in('kind',['practice','review']).gte('ended_at',new Date(Date.now()-24*60*60*1000).toISOString()).order('ended_at',{ascending:false});if(recent.error)throw recent.error;
  let learning:Session|null=null;
  for(const session of (recent.data??[]) as Session[])if(!(await sessionPhotoRows(session.id)).length){learning=session;break;}
  return {diagnostic,diagnosticPending,learning};
}
export async function sessionPhotoRows(sessionId:string) {
  const result=await createAdminSupabaseClient().from('learn_session_photos' as never).select('*').eq('session_id',sessionId).order('position');
  if(result.error)throw result.error;return (result.data??[]) as Omit<SessionPhoto,'url'>[];
}
export async function sessionPhotos(sessionId:string):Promise<SessionPhoto[]> {
  z.uuid().parse(sessionId);
  const client=await createServerSupabaseClient(),{data:{user}}=await client.auth.getUser();if(!user)throw new LearnUserError('로그인이 필요합니다.');
  const result=await createAdminSupabaseClient().from('learn_sessions').select('*').eq('id',sessionId).single();if(result.error)throw result.error;
  const session=result.data as unknown as Session;if(session.user_id===user.id)await requireLearner();else await requireCoach();
  const rows=await sessionPhotoRows(sessionId);
  return Promise.all(rows.map(async row=>{if(row.user_id!==session.user_id||!row.path.startsWith(session.user_id+'/sessions/'+session.id+'/')||row.path.includes('..'))throw new Error('잘못된 세션 사진 경로');const signed=await createAdminSupabaseClient().storage.from('learn-evidence').createSignedUrl(row.path,600);if(signed.error)throw signed.error;return {...row,url:signed.data.signedUrl};}));
}
export async function addSessionPhotoRuntime(input:unknown) {
  const user=await requireLearner(),value=z.object({sessionId:z.uuid(),path:z.string().min(1).max(1000)}).parse(input),session=await sessionRow(value.sessionId,user.id);
  if(!session.ended_at)throw new LearnUserError('세션을 마친 뒤 사진을 올려 주세요.');
  if(!value.path.startsWith(`${user.id}/sessions/${session.id}/`)||value.path.includes('..'))throw new Error('잘못된 사진 경로');
  const client=createAdminSupabaseClient(),slash=value.path.lastIndexOf('/');
  const listing=await client.storage.from('learn-evidence').list(value.path.slice(0,slash),{search:value.path.slice(slash+1)});
  if(listing.error||!listing.data?.some(row=>row.name===value.path.slice(slash+1)))throw new LearnUserError('사진 업로드를 확인해 주세요.');
  const result=await client.rpc('learn_add_session_photo' as never,{p_user_id:user.id,p_session_id:session.id,p_path:value.path} as never);
  if(result.error){if(result.error.message==='사진은 4장까지 올릴 수 있어요')throw new LearnUserError(result.error.message);throw result.error;}
  return sessionPhotos(session.id);
}

export async function signedSessionPhotoUrlRuntime(photoId:string) {
 z.uuid().parse(photoId);
 const auth=await createServerSupabaseClient(),{data:{user}}=await auth.auth.getUser();if(!user)throw new LearnUserError('로그인이 필요합니다.');
 const client=createAdminSupabaseClient(),result=await client.from('learn_session_photos' as never).select('*').eq('id',photoId).single();if(result.error)throw result.error;
 const photo=result.data as Omit<SessionPhoto,'url'>;
 if(photo.user_id!==user.id)await requireCoach();
 const session=await client.from('learn_sessions').select('user_id').eq('id',photo.session_id).single();if(session.error)throw session.error;
 if((session.data as {user_id:string}).user_id!==photo.user_id||!photo.path.startsWith(photo.user_id+'/sessions/'+photo.session_id+'/')||photo.path.includes('..'))throw new Error('잘못된 세션 사진 경로');
 const signed=await client.storage.from('learn-evidence').createSignedUrl(photo.path,300);if(signed.error)throw signed.error;return signed.data.signedUrl;
}
