'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {FiChevronRight,FiCheck,FiX} from 'react-icons/fi';
import type {Scene} from '@/lib/learn/lessons/schema';
import {sceneTitle} from '@/lib/learn/lessons/lesson-clock';
import styles from './contents.module.css';
export function LessonContents({scenes,index,completed,onSelect}:{scenes:Scene[];index:number;completed:number[];onSelect:(index:number)=>void}){
  const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),id=useId();
  useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false);button.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key,true);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key,true);};},[open]);
  return <div ref={root} className={styles.contents}>
    <button ref={button} type="button" className={styles.current} aria-expanded={open} aria-controls={id} aria-label="강의 목차" onClick={()=>setOpen(value=>!value)}><FiChevronRight data-open={open}/><span key={scenes[index].id}>{String(index+1).padStart(2,'0')}　{sceneTitle(scenes[index])}</span></button>
    {open&&<div id={id} className={styles.panel}><div className={styles.heading}><strong>강의 목차</strong><button type="button" aria-label="목차 닫기" onClick={()=>{setOpen(false);button.current?.focus();}}><FiX/></button></div>
      <ol role="list">{scenes.map((scene,i)=><li key={scene.id}><button type="button" aria-current={index===i?'step':undefined} onClick={()=>{onSelect(i);setOpen(false);button.current?.focus();}}><b>{String(i+1).padStart(2,'0')}</b><span>{sceneTitle(scene)}{scene.headline?.subtitle&&<small>{scene.headline.subtitle}</small>}</span>{completed.includes(i)&&<FiCheck aria-label="완료"/>}</button></li>)}</ol>
    </div>}
  </div>;
}
