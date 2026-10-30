import {stripMarkers} from './markers';
import 'next/headers';
import { createHash,randomUUID } from 'node:crypto';
import type { Lesson,Sentence } from './schema';
import type { AudioRow } from './types';
import {compactAlignment,speechResponseSchema} from './alignment';
import { ttsScript } from './tts-script';
export const LESSON_VOICE='apLXiNZEMBZ7cxxBoRlE';
export const LESSON_MODEL='eleven_v4';
export const AUDIO_BATCH_LIMIT=60;
export function audioHash(sentence:Sentence,voice=LESSON_VOICE,model=LESSON_MODEL){return createHash('sha256').update(JSON.stringify({script:ttsScript(sentence),voice,model})).digest('hex');}
export function audioPlan(lesson:Lesson,existing:Pick<AudioRow,'sentence_id'|'text_hash'>[],voice=LESSON_VOICE){
 const hashes=new Map(existing.map(row=>[row.sentence_id,row.text_hash]));const all=lesson.scenes.flatMap(s=>s.narration);const pending=all.filter(s=>hashes.get(s.id)!==audioHash(s,voice));
 return {total:all.length,generated:all.length-pending.length,missing:pending.length,pending,batch:pending.slice(0,AUDIO_BATCH_LIMIT),characters:pending.slice(0,AUDIO_BATCH_LIMIT).reduce((n,s)=>n+Array.from(ttsScript(s)).length,0)};
}
export type AudioGenerationResult={noKey?:boolean;generated:number;reused?:number;skipped:number;remaining:number;failed:{sentence_id:string;message:string}[]};
export async function requestSpeech(text:string,voice:string,key:string,timeoutMs:number,fetcher:typeof fetch=fetch){
 if(!key.trim())throw new Error('키 없음');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  // API format: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps (2026-10-30)
  const response=await fetcher(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=mp3_44100_128`,{method:'POST',signal:controller.signal,headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify({text:stripMarkers(text),model_id:LESSON_MODEL,voice_settings:{stability:.5,similarity_boost:.8,style:0,use_speaker_boost:true}})});
  if(!response.ok)throw new Error(`음성 요청 실패 (HTTP ${response.status})`);
  const payload=speechResponseSchema.parse(await response.json()),alignment=compactAlignment(payload.alignment),bytes=new Uint8Array(Buffer.from(payload.audio_base64,'base64'));if(!bytes.byteLength||bytes.byteLength>20*1024*1024)throw new Error('음성 응답 크기 오류');return {bytes,alignment,duration_ms:alignment.end.at(-1)!};
 }finally{clearTimeout(timer);}
}
export async function generateLessonAudio(lesson:Lesson,version:number,options:{key:string;voice?:string;existing:Pick<AudioRow,'sentence_id'|'text_hash'|'alignment'>[];reusable?:AudioRow[];forceAlignment?:boolean;sentenceIds?:string[];excludeIds?:string[];save:(row:Omit<AudioRow,'created_at'>,bytes?:Uint8Array)=>Promise<void>;fetcher?:typeof fetch;now?:()=>number}):Promise<AudioGenerationResult>{
 const voice=options.voice||LESSON_VOICE,plan=audioPlan(lesson,options.existing.filter(r=>!options.forceAlignment||r.alignment),voice),now=options.now??Date.now,started=now();
 const pending=plan.pending.filter(s=>(!options.sentenceIds||options.sentenceIds.includes(s.id))&&!options.excludeIds?.includes(s.id));
 const result:AudioGenerationResult={generated:0,skipped:plan.generated,remaining:pending.length,failed:[]};if(!options.key.trim())return {...result,noKey:true};
 for(const sentence of pending.slice(0,AUDIO_BATCH_LIMIT)){const remainingMs=45000-(now()-started);if(remainingMs<1000)break;
  try{const hash=audioHash(sentence,voice),shared=!options.forceAlignment?options.reusable?.filter(r=>r.lesson_id===lesson.id&&r.lesson_version!==version&&r.text_hash===hash&&r.path.startsWith(lesson.id+'/')&&!r.path.split('/').includes('..')).sort((a,b)=>Number(!!b.alignment)-Number(!!a.alignment))[0]:undefined;
   if(shared){await options.save({lesson_id:lesson.id,lesson_version:version,sentence_id:sentence.id,text_hash:hash,path:shared.path,duration_ms:shared.duration_ms,alignment:shared.alignment??null});result.reused=(result.reused??0)+1;}
   else{const speech=await requestSpeech(ttsScript(sentence),voice,options.key,Math.min(25000,remainingMs),options.fetcher);await options.save({lesson_id:lesson.id,lesson_version:version,sentence_id:sentence.id,text_hash:hash,path:lesson.id+'/'+version+'/'+sentence.id+'-'+randomUUID()+'.mp3',duration_ms:speech.duration_ms,alignment:speech.alignment},speech.bytes);result.generated++;}result.remaining--;}
  catch{result.failed.push({sentence_id:sentence.id,message:'음성 생성 또는 저장 실패. 다시 시도해 주세요.'});}
 }
 return result;
}
