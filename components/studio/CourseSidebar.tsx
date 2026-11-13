'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {LessonText} from '@/components/learn/lesson/LessonText';
import {FiCheck,FiPlay} from 'react-icons/fi';
import type {Lesson} from '@/lib/learn/lessons/schema';
import {currentChapter,type CurriculumView} from '@/lib/learn/lessons/curriculum';
import {parseResume,type LessonResume} from '@/lib/learn/lessons/lesson-clock';
import {formatTimelineTime} from '@/lib/learn/lessons/timeline';
import styles from './sidebar.module.css';

export function CourseSidebar({lesson,course,time=0,total=1}:{lesson:Lesson;course?:CurriculumView;time?:number;total?:number;index?:number;onSelectScene?:(index:number)=>void}){
  const chapter=course?currentChapter(course.curriculum,lesson.id):undefined;
  const [expanded,setExpanded]=useState<Record<string,boolean>>({}),[resume,setResume]=useState<LessonResume|null>(null);
  const storageKey='studio.chapters:'+(course?.curriculum.id??lesson.pack_id);
  useEffect(()=>{try{setExpanded({...JSON.parse(localStorage.getItem(storageKey)??'{}'),...(chapter===undefined?{}:{[chapter]:true})});setResume(parseResume(localStorage.getItem('studio.lastLesson')));}catch{}},[storageKey,chapter]);
  const toggle=(no:number,open:boolean)=>setExpanded(old=>{const next={...old,[no]:open};try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{}return next;});
  const row=(id:string,title:string,worked=false)=>{const completed=course?.completed?.includes(id)??false,current=id===lesson.id,available=current||course?.available.includes(id);const body=<><i aria-hidden="true">{completed&&<FiCheck/>}</i><span>{title}{completed&&<span className={styles.srOnly}> · 학습 완료</span>}{!available&&<small>준비 중</small>}</span></>;return <li key={id} data-current={current} data-completed={completed} data-worked={worked}>{current?<span aria-current="page">{body}</span>:available?<Link href={'/learn/lesson/'+encodeURIComponent(id)+(course?.query?'?'+course.query:'')}>{body}</Link>:<span aria-disabled="true">{body}</span>}</li>;};
  const progress=total>0?Math.max(0,Math.min(100,time/total*100)):0;
  return <aside className={styles.sidebar} aria-label="과정">
    <div className={styles.brand}><Link href="/learn" aria-label="학습 홈"><Image src="/brand/symbol.svg" alt="노베이스구조대" width={25} height={33} priority/><span>학습 스튜디오</span></Link></div>
    <section className={styles.current}><p>현재 강의</p><h2>{lesson.title}</h2><h3>학습 목표</h3><div className={styles.goal}><LessonText authored text={lesson.goal??lesson.intro??'강의를 듣고 개념을 확인해 보세요.'}/></div><div className={styles.progress}><progress aria-label="강 전체 진행률" max={100} value={progress}/><span>{Math.round(progress)}%</span></div></section>
    {course&&<nav aria-label="전체 교육 과정"><h3>전체 교육 과정</h3>
      {resume&&(resume.lessonId===lesson.id||course.available.includes(resume.lessonId))&&<Link className={styles.resume} href={'/learn/lesson/'+encodeURIComponent(resume.lessonId)+'?resume=1'}><FiPlay/><span>이어서 학습<small>{resume.title} · {formatTimelineTime(resume.time)}</small></span></Link>}
      {course.curriculum.chapters.map(ch=><details key={ch.no} open={expanded[ch.no]??ch.no===chapter} onToggle={e=>{if((expanded[ch.no]??ch.no===chapter)!==e.currentTarget.open)toggle(ch.no,e.currentTarget.open);}}><summary>{String(ch.no).padStart(2,'0')}　{ch.title}<span>⌄</span></summary><ul>{ch.items.flatMap(i=>[row(i.lesson_id,(i.no>0?i.no+' ':'')+i.title),...(i.worked??[]).map(w=>row(w.lesson_id,w.title,true))])}</ul></details>)}
    </nav>}
  </aside>;
}
