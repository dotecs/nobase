import { requireCoach,runtimeError } from '@/lib/learn/runtime';
import { lessonDb } from '@/lib/learn/lessons/data';
import { lessonSchema } from '@/lib/learn/lessons/schema';
import { audioPlan,LESSON_VOICE } from '@/lib/learn/lessons/audio';
import { LessonsAdmin } from './LessonsAdmin';
import { generateAudio,advanceLessonStatus } from './actions';
export const maxDuration=60;
/** 음성 행은 레슨·버전이 쌓이면 1,000행(PostgREST 기본 상한)을 넘으므로 필요한 열만 페이지로 나눠 모두 읽는다. */
async function allAudio(client:ReturnType<typeof lessonDb>){
 const data:{lesson_id:string;lesson_version:number;sentence_id:string;text_hash:string;alignment:unknown}[]=[];
 for(let from=0;;from+=1000){const page=await client.from('learn_lesson_audio').select('lesson_id,lesson_version,sentence_id,text_hash,alignment').order('lesson_id').order('lesson_version').order('sentence_id').range(from,from+999);if(page.error)return {data:null,error:page.error};data.push(...(page.data??[]) as typeof data);if((page.data?.length??0)<1000)return {data,error:null};}
}
export default async function LessonsPage(){
 try{await requireCoach();const client=lessonDb(),[lessons,audio]=await Promise.all([client.from('learn_lessons').select('*').order('id').order('version',{ascending:false}),allAudio(client)]);if(lessons.error)throw lessons.error;if(audio.error)throw audio.error;
 const rows=(lessons.data??[]).map(row=>{const plan=audioPlan(lessonSchema.parse(row.body),(audio.data??[]).filter(a=>a.lesson_id===row.id&&a.lesson_version===row.version),process.env.ELEVENLABS_VOICE_ID||LESSON_VOICE);return {id:row.id,version:row.version,title:row.title,kind:row.kind,status:row.status,total:plan.total,generated:plan.generated,missing:plan.missing,batch:plan.batch.length,characters:plan.characters,unaligned:(audio.data??[]).filter(a=>a.lesson_id===row.id&&a.lesson_version===row.version&&!a.alignment).length};});
 return <LessonsAdmin rows={rows} hasKey={!!process.env.ELEVENLABS_API_KEY?.trim()} generate={generateAudio} advance={advanceLessonStatus}/>;
 }catch(error){return <p role="alert">{runtimeError(error,'lesson.adminPage')}</p>;}
}
