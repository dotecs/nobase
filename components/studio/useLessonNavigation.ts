'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Lesson} from '@/lib/learn/lessons/schema';
import {initialLessonTime,resumeKey,type LessonClock} from '@/lib/learn/lessons/lesson-clock';

/** Navigation is keyed by lesson identity, never by refreshed RSC object identity. */
export function useLessonNavigation(lesson:Lesson,clock:LessonClock,autoplayFirst=false){
  const [cursor,setCursor]=useState({index:0,local:0,serial:0,autoplay:autoplayFirst});
  const [ready,setReady]=useState(false),[phase,setPhase]=useState<'out'|'in'|null>(null),[completed,setCompleted]=useState<number[]>([]);
  const position=useRef({index:0,local:0}),pending=useRef<{index:number;local:number}|null>(null),[time,setTime]=useState(0),started=useRef(0),[elapsed,setElapsed]=useState(0);
  const context=useRef({lesson,clock});context.current={lesson,clock};
  const timers=useRef<ReturnType<typeof setTimeout>[]>([]),lastSaved=useRef(0);
  const clear=useCallback(()=>{timers.current.forEach(clearTimeout);timers.current=[];},[]);
  const save=useCallback(()=>{const {lesson,clock}=context.current,point=pending.current??position.current;const value={lessonId:lesson.id,title:lesson.title,time:clock.toLesson(point.index,point.local)};try{localStorage.setItem(resumeKey(lesson.id),JSON.stringify(value));localStorage.setItem('studio.lastLesson',JSON.stringify(value));}catch{/* Playback works without storage. */}},[]);
  const navigate=useCallback((value:number,autoplay:boolean,hash=false)=>{
    const {lesson,clock}=context.current,next=clock.toScene(value);autoplay=autoplay&&value<clock.total;clear();pending.current=next;setTime(clock.toLesson(next.index,next.local));
    if(hash)history.replaceState(null,'','#'+encodeURIComponent(lesson.scenes[next.index].id));
    const apply=()=>{position.current=next;setTime(clock.toLesson(next.index,next.local));setCursor(old=>({...next,autoplay,serial:old.serial+1}));save();};
    if(next.index!==position.current.index){setPhase('out');timers.current=[setTimeout(()=>{apply();setPhase('in');},120),setTimeout(()=>setPhase(null),240)];}
    else {apply();setPhase(null);}
  },[clear,save]);
  useEffect(()=>{
    const {lesson,clock}=context.current;let raw:string|null=null;try{raw=localStorage.getItem(resumeKey(lesson.id));}catch{}
    const next=clock.toScene(initialLessonTime(lesson,clock,location.hash,raw));position.current=next;setTime(clock.toLesson(next.index,next.local));setCursor(old=>({...old,...next}));started.current=performance.now();if(location.hash)history.replaceState(null,'',location.href);setReady(true);
    const hash=()=>navigate(initialLessonTime(context.current.lesson,context.current.clock,location.hash,null),false);
    const flush=()=>save();window.addEventListener('hashchange',hash);window.addEventListener('pagehide',flush);
    return()=>{save();clear();window.removeEventListener('hashchange',hash);window.removeEventListener('pagehide',flush);};
  },[lesson.id,navigate,save,clear]);
  const progress=useCallback((index:number,local:number)=>{
    // The old player's pause event must not roll the range back during its fade-out.
    if(pending.current){if(index!==pending.current.index||Math.abs(local-pending.current.local)>1)return;pending.current=null;}
    position.current={index,local};setTime(context.current.clock.toLesson(index,local));if(performance.now()-lastSaved.current>=1000){save();lastSaved.current=performance.now();}
  },[save]);
  const markScene=()=>setCompleted(old=>old.includes(cursor.index)?old:[...old,cursor.index]);
  return {cursor,ready,phase,time,completed,navigate,progress,save,markScene,elapsed,markComplete:()=>setElapsed(performance.now()-started.current)};
}
