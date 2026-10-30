'use server';
import { requireLearner,runtimeError } from '@/lib/learn/runtime';
import { lessonDb,publishedLesson,audioUrls,conceptCardData } from '@/lib/learn/lessons/data';
import { lessonEventsSchema } from '@/lib/learn/lessons/events';
import { audioDurationSchema } from '@/lib/learn/lessons/audio-duration';
import { audioHash,LESSON_VOICE } from '@/lib/learn/lessons/audio';
import type { LessonEvent } from '@/lib/learn/lessons/types';
export async function loadConceptCard(id:string){try{await requireLearner();const data=await conceptCardData(id);return data?{data}:{error:'개념을 찾을 수 없습니다.'};}catch(error){return {error:runtimeError(error,'lesson.conceptCard')};}}
export async function recordLessonEvents(id:string,version:number,input:LessonEvent[]):Promise<{error?:string}>{
 try{const user=await requireLearner();const events=lessonEventsSchema.parse(input),lesson=await publishedLesson(id,version);if(!lesson)throw new Error('Published lesson missing');
 const scenes=new Set(lesson.body.scenes.map(s=>s.id)),sentences=new Set(lesson.body.scenes.flatMap(s=>s.narration.map(n=>n.id)));
 for(const e of events){if(e.payload.scene_id&&!scenes.has(String(e.payload.scene_id)))throw new Error('Invalid lesson scene');if(e.payload.sentence_id&&!sentences.has(String(e.payload.sentence_id)))throw new Error('Invalid lesson sentence');}
 const result=await lessonDb().from('learn_lesson_events').insert(events.map(event=>({...event,user_id:user.id,lesson_id:id,lesson_version:version})));if(result.error)throw result.error;return {};
 }catch(error){return {error:runtimeError(error,'lesson.recordEvents')};}
}
export async function refreshLessonAudio(id:string,version:number):Promise<Record<string,string>>{await requireLearner();if(!await publishedLesson(id,version))return {};return audioUrls(id,version);}

// Playback metadata only; never used for grading or learner state decisions.
export async function recordLessonAudioDuration(id:string,version:number,sentenceId:string,durationMs:number):Promise<{error?:string}>{
 try{await requireLearner();const input=audioDurationSchema.parse({sentenceId,durationMs}),lesson=await publishedLesson(id,version);const sentence=lesson?.body.scenes.flatMap(s=>s.narration).find(s=>s.id===input.sentenceId);if(!sentence)throw new Error('Published lesson sentence missing');
 const result=await lessonDb().from('learn_lesson_audio').update({duration_ms:input.durationMs}).eq('lesson_id',id).eq('lesson_version',version).eq('sentence_id',input.sentenceId).eq('text_hash',audioHash(sentence,process.env.ELEVENLABS_VOICE_ID||LESSON_VOICE)).is('duration_ms',null);if(result.error)throw result.error;return {};
 }catch(error){return {error:runtimeError(error,'lesson.audioDuration')};}
}
