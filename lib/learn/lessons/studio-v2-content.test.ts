import {it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {lessonSchema} from './schema';
import {audioHash,generateLessonAudio} from './audio';
import {rawTtsScript} from './tts-script';
import type {AudioRow} from './types';
for(const id of ['rm-11','rm-11-w1'])it(id+' reuses every existing hash after action and marker changes without paid calls',async()=>{
 const original=lessonSchema.parse(JSON.parse(readFileSync('content/lessons/'+id+'.json','utf8'))),next=structuredClone(original);
 for(const scene of next.scenes)for(const sentence of scene.narration){sentence.tts='⟨p1⟩'+rawTtsScript(sentence);sentence.cue={...sentence.cue,actions:(sentence.cue?.actions??[]).map(action=>({...action,...(typeof action.at==='object'?{position:action.at}:{}),at:'@p1'}))};}
 lessonSchema.parse(next);
 const reusable:AudioRow[]=original.scenes.flatMap(s=>s.narration).map(s=>({lesson_id:id,lesson_version:2,sentence_id:s.id,text_hash:audioHash(s),path:id+'/2/'+s.id+'.mp3',alignment:null,duration_ms:2000,created_at:''})),saved:AudioRow[]=[],fetcher=vi.fn();
 let remaining=reusable.length;while(remaining){const result=await generateLessonAudio(next,3,{key:'mock-only',existing:saved,reusable,fetcher,save:async(row,bytes)=>{expect(bytes).toBeUndefined();saved.push({...row,created_at:''});}});expect(result.failed).toEqual([]);expect(result.generated).toBe(0);expect(result.remaining).toBeLessThan(remaining);remaining=result.remaining;}
 expect(fetcher).not.toHaveBeenCalled();expect(saved).toHaveLength(reusable.length);expect(saved.every(row=>row.path.startsWith(id+'/2/')&&row.lesson_version===3)).toBe(true);
});
