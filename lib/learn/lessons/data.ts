import 'next/headers';
import {parseAlignment,type Alignment} from './alignment';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { normalizeLessonActions } from './legacy-actions';
import { lessonSchema } from './schema';
import type { LessonsDatabase } from './types';
import { conceptLessonHref,conceptNeighbors } from './concepts';
import { audioHash,LESSON_VOICE } from './audio';
export const lessonDb=()=>createAdminSupabaseClient() as unknown as SupabaseClient<LessonsDatabase>;
export async function conceptCardData(id:string){const result=await lessonDb().from('learn_concepts').select('*').eq('id',id).maybeSingle();if(result.error)throw result.error;const node=result.data;if(!node)return null;const graph=await conceptGraph(node.pack_id),lesson=node.lesson_id?await publishedLesson(node.lesson_id):null;return {node,...conceptNeighbors(id,graph.nodes,graph.edges),lessonHref:conceptLessonHref(id,lesson?.body??null)};}
export async function conceptGraph(packId:string){const client=lessonDb();const nodes=await client.from('learn_concepts').select('*').eq('pack_id',packId);if(nodes.error)throw nodes.error;if(!nodes.data?.length)return {nodes:[],edges:[]};const edges=await client.from('learn_concept_edges').select('*').in('target_id',nodes.data.map(n=>n.id));if(edges.error)throw edges.error;const ids=new Set(nodes.data.map(n=>n.id));return {nodes:nodes.data,edges:(edges.data??[]).filter(e=>ids.has(e.source_id))};}
export async function publishedLesson(id:string,version?:number){
 let query=lessonDb().from('learn_lessons').select('*').eq('id',id).in('status',['reviewed','live']);if(version!==undefined)query=query.eq('version',version);
 const {data,error}=await query.order('version',{ascending:false}).limit(1).maybeSingle();if(error)throw error;
 return data?{...data,body:normalizeLessonActions(lessonSchema.parse(data.body))}:null;
}
export async function audioUrls(id:string,version:number){return (await audioPlayback(id,version)).urls;}
export async function audioPlayback(id:string,version:number){
 const empty={alignments:{} as Record<string,Alignment|null>,urls:{} as Record<string,string>,durations:{} as Record<string,number|null>};
 const client=lessonDb(),rows=await client.from('learn_lesson_audio').select('*').eq('lesson_id',id).eq('lesson_version',version);if(rows.error)throw rows.error;
 const lesson=await publishedLesson(id,version);if(!lesson)return empty;const sentences=new Map(lesson.body.scenes.flatMap(s=>s.narration).map(s=>[s.id,s]));
 const valid=(rows.data??[]).filter(row=>row.path.startsWith(`${id}/`)&&!row.path.split('/').includes('..')&&sentences.has(row.sentence_id)&&row.text_hash===audioHash(sentences.get(row.sentence_id)!,process.env.ELEVENLABS_VOICE_ID||LESSON_VOICE));if(!valid.length)return empty;
 const signed=await client.storage.from('learn-lessons').createSignedUrls(valid.map(r=>r.path),600);if(signed.error)throw signed.error;
 return {alignments:Object.fromEntries(valid.map(row=>[row.sentence_id,parseAlignment(row.alignment)])),urls:Object.fromEntries(valid.flatMap((row,i)=>signed.data?.[i]?.signedUrl?[[row.sentence_id,signed.data[i].signedUrl]]:[])),durations:Object.fromEntries(valid.map(row=>[row.sentence_id,row.duration_ms]))};
}
