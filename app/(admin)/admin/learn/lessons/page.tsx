import { requireCoach,runtimeError } from '@/lib/learn/runtime';
import { lessonDb } from '@/lib/learn/lessons/data';
import { lessonSchema } from '@/lib/learn/lessons/schema';
import { audioPlan,LESSON_VOICE } from '@/lib/learn/lessons/audio';
import { LessonsAdmin } from './LessonsAdmin';
import { generateAudio,advanceLessonStatus } from './actions';
export const maxDuration=60;
export default async function LessonsPage(){
 try{await requireCoach();const client=lessonDb(),[lessons,audio]=await Promise.all([client.from('learn_lessons').select('*').order('id').order('version',{ascending:false}),client.from('learn_lesson_audio').select('*')]);if(lessons.error)throw lessons.error;if(audio.error)throw audio.error;
 const rows=(lessons.data??[]).map(row=>{const plan=audioPlan(lessonSchema.parse(row.body),(audio.data??[]).filter(a=>a.lesson_id===row.id&&a.lesson_version===row.version),process.env.ELEVENLABS_VOICE_ID||LESSON_VOICE);return {id:row.id,version:row.version,title:row.title,kind:row.kind,status:row.status,total:plan.total,generated:plan.generated,missing:plan.missing,batch:plan.batch.length,characters:plan.characters};});
 return <LessonsAdmin rows={rows} hasKey={!!process.env.ELEVENLABS_API_KEY?.trim()} generate={generateAudio} advance={advanceLessonStatus}/>;
 }catch(error){return <p role="alert">{runtimeError(error,'lesson.adminPage')}</p>;}
}
