'use client';
import { useCallback,useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import type {Alignment} from '@/lib/learn/lessons/alignment';
import type { Scene } from '@/lib/learn/lessons/schema';
import type { LessonEvent } from '@/lib/learn/lessons/types';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import { stageStateAt } from '@/lib/learn/lessons/stage-state-at';
import { buildTimeline,PLAYBACK_RATES,timelinePosition } from '@/lib/learn/lessons/timeline';
import {Caption} from './Caption';
import {Transport} from './Transport';
const EMPTY_URLS:Record<string,string>={},EMPTY_DURATIONS:Record<string,number|null>={};
export type Playback={state:StageState;time:number;sentenceStart:number;playing:boolean;ended:boolean;bar:ReactNode;caption:ReactNode;pause:()=>void;seek:(time:number)=>void};
type Props={showCaptions?:boolean;onToggleCaptions?:()=>void;alignments?:Record<string,Alignment|null>;scene:Scene;audioUrls?:Record<string,string>;durations?:Record<string,number|null>;worked?:boolean;isLastScene?:boolean;onPrevious?:()=>void;onNext?:()=>void;onResume?:()=>void;onSeek?:()=>void;refreshAudio?:()=>Promise<Record<string,string>>;onDuration?:(sentenceId:string,ms:number)=>Promise<unknown>;onEvent?:(event:LessonEvent)=>void;children:(playback:Playback)=>ReactNode};
/** Mount with key={scene.id}. One clock drives media, captions and deterministic stage state. */
export default function StudioPlayer({scene,alignments,showCaptions,onToggleCaptions,audioUrls=EMPTY_URLS,durations=EMPTY_DURATIONS,worked,isLastScene=false,onPrevious,onNext,onResume,onSeek,onDuration,onEvent,refreshAudio,children}:Props){
 const [sources,setSources]=useState(audioUrls),refreshed=useRef(new Set<string>()),mounted=useRef(true);
 useEffect(()=>setSources(audioUrls),[audioUrls]);
 const [known,setKnown]=useState(durations),timeline=useMemo(()=>buildTimeline(scene,known),[scene,known]);
 const audio=useRef<HTMLAudioElement>(null),clock=useRef({time:0,playing:false,rate:1,failed:false});
 const [playing,setPlaying]=useState(false),[rate,setRate]=useState(1),[localCaptions,setLocalCaptions]=useState(true);
 const initial=useMemo(()=>stageStateAt(scene,0,timeline.starts,{alignments,durations:known}),[scene,timeline,alignments,known]);
 const [snapshot,setSnapshot]=useState({time:0,state:initial});
 const last=useRef({time:0,json:JSON.stringify(initial),state:initial});
 const handlers=useRef({onPrevious,onNext,onResume,onSeek,onDuration,onEvent,isLastScene,refreshAudio});handlers.current={onPrevious,onNext,onResume,onSeek,onDuration,onEvent,isLastScene,refreshAudio};
 const opened=useRef(false),complete=useRef(false),reported=useRef(''),visit=useRef({id:'',started:0});
 const emit=useCallback((event:LessonEvent)=>{if(!visit.current.id)visit.current={id:crypto.randomUUID(),started:performance.now()};handlers.current.onEvent?.({...event,payload:{...event.payload,visit_id:visit.current.id,elapsed_ms:Math.round(performance.now()-visit.current.started)}});},[]);
 const commit=useCallback((value:number,force=false)=>{const time=Math.max(0,Math.min(timeline.totalMs,value));clock.current.time=time;const next=stageStateAt(scene,time,timeline.starts,{alignments,durations:known}),json=JSON.stringify(next),changed=json!==last.current.json;
  if(force||changed||Math.floor(time/80)!==Math.floor(last.current.time/80)){const state=changed?next:last.current.state;last.current={time,json,state};setSnapshot({time,state});}
 },[scene,timeline]);
 const pause=useCallback(()=>{clock.current.playing=false;setPlaying(false);audio.current?.pause();},[]);
 const seek=useCallback((value:number)=>{handlers.current.onSeek?.();commit(value,true);const position=timelinePosition(timeline,clock.current.time),element=audio.current;if(element?.dataset.sentence===timeline.entries[position.index].sentence.id){try{element.currentTime=position.localMs/1000;}catch{ /* Metadata may not be loaded yet. */ }}if(position.ended)pause();},[commit,timeline,pause]);
 const play=useCallback(()=>{handlers.current.onResume?.();if(clock.current.time>=timeline.totalMs){complete.current=false;commit(0,true);}clock.current.playing=true;setPlaying(true);const element=audio.current;if(element?.dataset.source)void element.play().catch(error=>{if(error?.name!=='AbortError'&&clock.current.playing)clock.current.failed=true;});},[timeline,commit]);
 const changeRate=useCallback((value:number)=>{if(!(PLAYBACK_RATES as readonly number[]).includes(value))return;clock.current.rate=value;setRate(value);if(audio.current)audio.current.playbackRate=value;commit(clock.current.time,true);},[commit]);
 const position=timelinePosition(timeline,snapshot.time),entry=timeline.entries[position.index],src=sources[entry.sentence.id];
 useEffect(()=>{if(!opened.current){opened.current=true;emit({type:'scene',payload:{scene_id:scene.id}});}},[scene.id,emit]);
 useEffect(()=>{if(playing&&reported.current!==entry.sentence.id){reported.current=entry.sentence.id;emit({type:'sentence',payload:{scene_id:scene.id,sentence_id:entry.sentence.id}});}},[playing,entry.sentence.id,scene.id,emit]);
 useEffect(()=>{const element=audio.current;if(!element)return;const pos=timelinePosition(timeline,clock.current.time),sentence=timeline.entries[pos.index].sentence,url=sources[sentence.id];
  if(element.dataset.sentence!==sentence.id||element.dataset.source!==(url??'')){element.pause();clock.current.failed=false;element.dataset.sentence=sentence.id;element.dataset.source=url??'';if(url)element.src=url;else element.removeAttribute('src');element.load();}
  element.playbackRate=rate;if(url){try{if(Math.abs(element.currentTime-pos.localMs/1000)>.08)element.currentTime=pos.localMs/1000;}catch{}if(playing)void element.play().catch(error=>{if(error?.name!=='AbortError'&&clock.current.playing&&element.dataset.sentence===sentence.id)clock.current.failed=true;});else element.pause();}
 },[position.index,playing,rate,timeline,sources]);
 useEffect(()=>{let frame=0,previous=performance.now();const tick=(now:number)=>{const elapsed=now-previous;previous=now;if(clock.current.playing){const pos=timelinePosition(timeline,clock.current.time),active=timeline.entries[pos.index],element=audio.current,url=sources[active.sentence.id];let time=clock.current.time;
   if(url&&!clock.current.failed){if(element?.dataset.sentence===active.sentence.id){if(element.ended)time=active.endMs;else if(element.readyState>=2&&!element.paused)time=active.startMs+element.currentTime*1000;}}
   else time+=Math.min(elapsed,250)*clock.current.rate;
   commit(time);if(time>=timeline.totalMs){pause();commit(timeline.totalMs,true);if(!complete.current){complete.current=true;if(handlers.current.isLastScene)emit({type:'complete',payload:{scene_id:scene.id,duration_ms:timeline.totalMs}});}}
  }frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[scene,timeline,sources,commit,pause,emit]);
 useEffect(()=>{mounted.current=true;const element=audio.current;return()=>{mounted.current=false;element?.pause();};},[]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{const target=event.target as HTMLElement;if(target.closest('input,textarea,select,dialog,[role="dialog"],[contenteditable="true"]')||(event.code==='Space'&&target.closest('button,summary,a'))||event.altKey||event.ctrlKey||event.metaKey)return;let handled=true;if(event.code==='Space'){if(clock.current.playing)pause();else play();}else if(event.key==='ArrowLeft')handlers.current.onPrevious?.();else if(event.key==='ArrowRight')handlers.current.onNext?.();else if(event.key==='ArrowUp'||event.key==='ArrowDown'){const index=(PLAYBACK_RATES as readonly number[]).indexOf(clock.current.rate);changeRate(PLAYBACK_RATES[Math.max(0,Math.min(PLAYBACK_RATES.length-1,index+(event.key==='ArrowUp'?1:-1)))]);}else handled=false;if(handled)event.preventDefault();};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[pause,play,changeRate]);
 const audioError=()=>{clock.current.failed=true;const id=audio.current?.dataset.sentence;if(!id||refreshed.current.has(id)||!handlers.current.refreshAudio)return;refreshed.current.add(id);void handlers.current.refreshAudio().then(next=>{if(mounted.current)setSources(old=>({...old,...next}));}).catch(()=>{});};
 const metadata=()=>{const element=audio.current,id=element?.dataset.sentence;if(!element||!id||!Number.isFinite(element.duration)||element.duration<=0)return;const ms=Math.round(element.duration*1000),cursor=timelinePosition(timeline,clock.current.time);if(timeline.entries[cursor.index].sentence.id===id){try{element.currentTime=Math.min(cursor.localMs,ms)/1000;}catch{}}if(known[id])return;const next={...known,[id]:ms},nextTimeline=buildTimeline(scene,next);clock.current.time=nextTimeline.entries[cursor.index].startMs+Math.min(cursor.localMs,nextTimeline.entries[cursor.index].durationMs);setKnown(next);void handlers.current.onDuration?.(id,ms).catch(()=>{});};
 useEffect(()=>{commit(clock.current.time,true);},[commit]);
 const visible=showCaptions??localCaptions;const bar=<Transport time={snapshot.time} total={timeline.totalMs} playing={playing} rate={rate} captions={visible} onPlay={play} onPause={pause} onSeek={seek} onRate={changeRate} onCaptions={()=>{setLocalCaptions(!visible);onToggleCaptions?.();}} audio={!!src}/>;
 const caption=visible?<Caption sentence={entry.sentence} alignment={alignments?.[entry.sentence.id]} time={position.localMs} duration={entry.durationMs} worked={worked}/>:null;
 return <>{children({state:snapshot.state,time:snapshot.time,sentenceStart:entry.startMs,playing,ended:position.ended,bar,caption,pause,seek})}<audio hidden ref={audio} preload="metadata" onLoadedMetadata={metadata} onError={audioError} onEnded={()=>{const id=audio.current?.dataset.sentence,finished=timeline.entries.find(e=>e.sentence.id===id);if(finished)commit(finished.endMs,true);}}/></>;
}
