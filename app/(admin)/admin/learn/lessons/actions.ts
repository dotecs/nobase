'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCoach,runtimeError } from '@/lib/learn/runtime';
import { lessonDb } from '@/lib/learn/lessons/data';
import { lessonSchema } from '@/lib/learn/lessons/schema';
import { generateLessonAudio,LESSON_VOICE } from '@/lib/learn/lessons/audio';
import type { AudioGenerationResult } from '@/lib/learn/lessons/audio';
export async function generateAudio(id:string,version:number,options:{forceAlignment?:boolean;sentenceIds?:string[];excludeIds?:string[]}={}):Promise<{result?:AudioGenerationResult;error?:string}>{
 try{await requireCoach();const key=process.env.ELEVENLABS_API_KEY?.trim();if(!key)return {error:'키 없음'};
 const client=lessonDb(),lesson=await client.from('learn_lessons').select('*').eq('id',id).eq('version',version).single();if(lesson.error)throw lesson.error;
 const settings=z.object({forceAlignment:z.boolean().optional(),sentenceIds:z.array(z.string()).max(1000).optional(),excludeIds:z.array(z.string()).max(1000).optional()}).parse(options);
 const existing=await client.from('learn_lesson_audio').select('*').eq('lesson_id',id);if(existing.error)throw existing.error;
 const result=await generateLessonAudio(lessonSchema.parse(lesson.data.body),version,{key,voice:process.env.ELEVENLABS_VOICE_ID||LESSON_VOICE,...settings,existing:(existing.data??[]).filter(r=>r.lesson_version===version),reusable:existing.data??[],save:async(row,bytes)=>{
  if(bytes){const uploaded=await client.storage.from('learn-lessons').upload(row.path,bytes,{contentType:'audio/mpeg',upsert:true,cacheControl:'0'});if(uploaded.error)throw uploaded.error;}
  const saved=await client.from('learn_lesson_audio').upsert(row,{onConflict:'lesson_id,lesson_version,sentence_id'});if(saved.error)throw saved.error;
 }});revalidatePath('/admin/learn/lessons');return {result};
 }catch(error){return {error:runtimeError(error,'lesson.generateAudio')};}
}
export async function advanceLessonStatus(id:string,version:number,status:'reviewed'|'live'):Promise<{error?:string}>{
 try{await requireCoach();z.enum(['reviewed','live']).parse(status);z.number().int().positive().parse(version);const client=lessonDb();
 const row=await client.from('learn_lessons').select('*').eq('id',id).eq('version',version).single();if(row.error)throw row.error;lessonSchema.parse(row.data.body);
 const result=await client.from('learn_lessons').update({status}).eq('id',id).eq('version',version).eq('status',status==='reviewed'?'draft':'reviewed').select('id');if(result.error)throw result.error;if(!result.data?.length)return {error:'레슨 상태가 변경되었습니다. 새로고침 후 확인해 주세요.'};
 revalidatePath('/admin/learn/lessons');revalidatePath('/learn');revalidatePath('/learn/lesson/'+id);return {};
 }catch(error){return {error:runtimeError(error,'lesson.advanceStatus')};}
}
