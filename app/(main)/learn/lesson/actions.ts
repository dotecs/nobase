'use server';
import { requireLearner,runtimeError } from '@/lib/learn/runtime';
import { lessonDb,publishedLesson,audioUrls } from '@/lib/learn/lessons/data';
import { lessonEventsSchema } from '@/lib/learn/lessons/events';
import type { LessonEvent } from '@/lib/learn/lessons/types';
export async function recordLessonEvents(id:string,version:number,input:LessonEvent[]):Promise<{error?:string}>{
 try{const user=await requireLearner();const events=lessonEventsSchema.parse(input),lesson=await publishedLesson(id,version);if(!lesson)throw new Error('Published lesson missing');
 const scenes=new Set(lesson.body.scenes.map(s=>s.id)),sentences=new Set(lesson.body.scenes.flatMap(s=>s.narration.map(n=>n.id)));
 for(const e of events){if(e.payload.scene_id&&!scenes.has(String(e.payload.scene_id)))throw new Error('Invalid lesson scene');if(e.payload.sentence_id&&!sentences.has(String(e.payload.sentence_id)))throw new Error('Invalid lesson sentence');}
 const result=await lessonDb().from('learn_lesson_events').insert(events.map(event=>({...event,user_id:user.id,lesson_id:id,lesson_version:version})));if(result.error)throw result.error;return {};
 }catch(error){return {error:runtimeError(error,'lesson.recordEvents')};}
}
export async function refreshLessonAudio(id:string,version:number):Promise<Record<string,string>>{await requireLearner();if(!await publishedLesson(id,version))return {};return audioUrls(id,version);}
