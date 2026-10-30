import 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { lessonSchema } from './schema';
import type { LessonsDatabase } from './types';
export const lessonDb=()=>createAdminSupabaseClient() as unknown as SupabaseClient<LessonsDatabase>;
export async function publishedLesson(id:string,version?:number){
 let query=lessonDb().from('learn_lessons').select('*').eq('id',id).in('status',['reviewed','live']);if(version!==undefined)query=query.eq('version',version);
 const {data,error}=await query.order('version',{ascending:false}).limit(1).maybeSingle();if(error)throw error;
 return data?{...data,body:lessonSchema.parse(data.body)}:null;
}
export async function audioUrls(id:string,version:number){
 const client=lessonDb(),rows=await client.from('learn_lesson_audio').select('*').eq('lesson_id',id).eq('lesson_version',version);if(rows.error)throw rows.error;
 const valid=(rows.data??[]).filter(row=>row.path.startsWith(`${id}/${version}/`));if(!valid.length)return {};
 const signed=await client.storage.from('learn-lessons').createSignedUrls(valid.map(r=>r.path),600);if(signed.error)throw signed.error;
 return Object.fromEntries(valid.flatMap((row,i)=>signed.data?.[i]?.signedUrl?[[row.sentence_id,signed.data[i].signedUrl]]:[]));
}
