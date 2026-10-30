'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { ConceptTrace } from './ConceptTrace';
import { FocusShell } from '../FocusShell';
import { LessonStage } from './LessonStage';
import { LessonText } from './LessonText';
import type { Lesson } from '@/lib/learn/lessons/schema';
import type { ConceptNode,ConceptEdge,LessonEvent } from '@/lib/learn/lessons/types';
import { captionDuration } from '@/lib/learn/lessons/events';
import styles from './lesson.module.css';
export type LessonViewerProps={lesson:Lesson;graph?:{nodes:ConceptNode[];edges:ConceptEdge[]};audio?:Record<string,string>;record:(events:LessonEvent[])=>Promise<{error?:string}>;refreshAudio?:()=>Promise<Record<string,string>>};
export function LessonViewer({lesson,audio={},graph={nodes:[],edges:[]},record,refreshAudio}:LessonViewerProps){
 const sentences=lesson.scenes.flatMap(scene=>scene.narration.map(sentence=>({scene,sentence})));
 const [index,setIndex]=useState(0),[running,setRunning]=useState(false),[sound,setSound]=useState(true),[rate,setRate]=useState(1),[notice,setNotice]=useState(''),[trace,setTrace]=useState<string|null>(null);
 const player=useRef<HTMLAudioElement>(null),root=useRef<HTMLDivElement>(null),queue=useRef<LessonEvent[]>([]),started=useRef(0),seen=useRef(new Set<string>()),opened=useRef(false),busy=useRef(false),urls=useRef(audio);
 const debounce=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const flush=useCallback(async()=>{if(busy.current||!queue.current.length)return;busy.current=true;const batch=queue.current.splice(0,50);try{const result=await record(batch);if(result.error)setNotice(result.error);}catch{setNotice('활동 기록을 저장하지 못했습니다.');}finally{busy.current=false;}},[record]);
 const emit=useCallback((event:LessonEvent)=>{queue.current.push(event);if(queue.current.length>=10){clearTimeout(debounce.current);void flush();}else if(event.type!=='sentence'){clearTimeout(debounce.current);debounce.current=setTimeout(()=>void flush(),500);}},[flush]);
 useEffect(()=>{if(!opened.current){opened.current=true;emit({type:'open',payload:{}});}const leave=()=>void flush();window.addEventListener('pagehide',leave);return()=>{clearTimeout(debounce.current);window.removeEventListener('pagehide',leave);void flush();};},[emit,flush]);
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{entries.filter(e=>e.isIntersecting).forEach(e=>{const scene_id=e.target.id;if(!seen.current.has(scene_id)){seen.current.add(scene_id);emit({type:'scene',payload:{scene_id}});}});},{threshold:.2});root.current?.querySelectorAll('[data-scene]').forEach(e=>observer.observe(e));return()=>observer.disconnect();},[emit]);
 const current=sentences[index];
 useEffect(()=>{
  if(!running||!current)return;let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined;const media=player.current;
  emit({type:'sentence',payload:{scene_id:current.scene.id,sentence_id:current.sentence.id}});
  root.current?.querySelector(`[data-sentence="${current.sentence.id}"]`)?.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  const finish=()=>{if(cancelled)return;if(index+1<sentences.length)setIndex(index+1);else{setRunning(false);emit({type:'complete',payload:{duration_ms:Math.max(0,Date.now()-started.current)}});void flush();}};
  const fallback=()=>{if(cancelled||timer)return;timer=setTimeout(finish,captionDuration(current.sentence.text,rate));};
  if(sound&&media&&urls.current[current.sentence.id]){
   media.src=urls.current[current.sentence.id];media.playbackRate=rate;media.onended=finish;
   media.onerror=()=>{if(refreshAudio)void refreshAudio().then(next=>{if(cancelled)return;urls.current=next;if(next[current.sentence.id]&&next[current.sentence.id]!==media.src){media.onerror=fallback;media.src=next[current.sentence.id];void media.play().catch(fallback);}else fallback();}).catch(fallback);else fallback();};
   void media.play().catch(()=>{if(!cancelled){setNotice('음성을 재생할 수 없어 자막으로 진행합니다.');fallback();}});
  }else fallback();
  return()=>{cancelled=true;clearTimeout(timer);if(media){media.pause();media.onended=null;media.onerror=null;}};
 },[index,running,sound,rate,current?.sentence.id,emit,flush,refreshAudio]);
 const begin=(restart=false)=>{if(restart){setIndex(0);setRunning(false);setTimeout(()=>setRunning(true),0);}else setRunning(true);started.current=Date.now();setNotice('');};
 return <FocusShell title={lesson.title} tone="lesson" lessonKind={lesson.kind} toolbar={<div className={styles.controls}><button type="button" onClick={()=>begin()} disabled={running}>재생</button><button type="button" onClick={()=>{setRunning(false);void flush();}} disabled={!running}>정지</button><button type="button" onClick={()=>begin(true)}>처음부터</button><button type="button" aria-pressed={sound} onClick={()=>setSound(v=>!v)}>음성 {sound?'켬':'끔'}</button><label>속도 <select value={rate} onChange={e=>setRate(Number(e.target.value))}><option value={1}>1배</option><option value={1.25}>1.25배</option></select></label></div>}>
  <audio ref={player} preload="none" aria-label="레슨 음성"/>{notice&&<p role="status">{notice}</p>}{lesson.intro&&<div><LessonText text={lesson.intro}/></div>}
  <div ref={root} className={styles.scenes}>{lesson.scenes.map(scene=><section className={styles.scene} data-scene id={scene.id} key={scene.id}><h2>{scene.title}</h2><div className={styles.columns}><LessonStage scene={scene} cue={current?.scene.id===scene.id?current.sentence.cue:undefined} onWhy={concept_id=>emit({type:'why_click',payload:{scene_id:scene.id,concept_id}})} onTrace={concept_id=>{setTrace(concept_id);emit({type:'dontknow',payload:{scene_id:scene.id,concept_id}});}} onQuiz={(option_id,correct)=>emit({type:'quiz',payload:{scene_id:scene.id,option_id,correct}})}/><div className={styles.rail}>{scene.narration.map(sentence=><div key={sentence.id} data-sentence={sentence.id} data-active={running&&current.sentence.id===sentence.id} data-role={lesson.kind==='worked'?sentence.role:undefined} className={styles.caption}>{lesson.kind==='worked'&&<strong>{sentence.role==='think'?'머릿속':sentence.role==='write'?'종이에':'설명'}</strong>}<LessonText text={sentence.text}/></div>)}</div></div></section>)}</div>
  {trace&&<ConceptTrace key={trace} start={trace} nodes={graph.nodes} edges={graph.edges} onEvent={emit} onClose={()=>setTrace(null)}/>}
 </FocusShell>;
}
