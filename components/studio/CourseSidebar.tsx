'use client';
import Link from 'next/link';
import Image from 'next/image';
import { LessonText } from '@/components/learn/lesson/LessonText';
import {FiCheck} from 'react-icons/fi';
import type {Lesson} from '@/lib/learn/lessons/schema';
import {currentChapter,type CurriculumView} from '@/lib/learn/lessons/curriculum';
import styles from './sidebar.module.css';
export function CourseSidebar({lesson,index,course}:{lesson:Lesson;index:number;course?:CurriculumView}){const chapter=course?currentChapter(course.curriculum,lesson.id):undefined;const row=(id:string,title:string,worked=false)=>{const completed=course?.completed?.includes(id)??false,current=id===lesson.id,available=current||course?.available.includes(id);const body=<><i aria-hidden="true">{completed&&<FiCheck/>}</i><span>{title}{completed&&<span className={styles.srOnly}> · 학습 완료</span>}{!available&&<small>준비 중</small>}</span></>;return <li key={id} data-current={current} data-completed={completed} data-worked={worked}>{current?<span aria-current="page">{body}</span>:available?<Link href={'/learn/lesson/'+encodeURIComponent(id)} aria-current={current?'page':undefined}>{body}</Link>:<span aria-disabled="true">{body}</span>}</li>;};return <aside className={styles.sidebar} aria-label="과정"><div className={styles.brand}><Link href="/learn" aria-label="학습 홈"><Image src="/brand/symbol.svg" alt="노베이스구조대" width={25} height={33} priority/><span>학습 스튜디오</span></Link></div><section className={styles.current}><p>현재 강의</p><h2>{lesson.title}</h2><h3>학습 목표</h3><div className={styles.goal}><LessonText authored text={lesson.goal??lesson.intro??'강의를 듣고 개념을 확인해 보세요.'}/></div><div className={styles.progress}><progress max={lesson.scenes.length} value={index+1}/><span>{index+1} / {lesson.scenes.length}</span></div><div className={styles.outline}>
 <h3>강의 구성 <span>{lesson.scenes.length}개 장면</span></h3>
 <ol className={styles.scenes} aria-label="강의 장면 구성">{lesson.scenes.map((scene,sceneIndex)=><li key={scene.id} data-scene-current={sceneIndex===index} aria-current={sceneIndex===index?'step':undefined}>
  <b aria-hidden="true">{String(sceneIndex+1).padStart(2,'0')}</b>
  <div><span>{(scene.headline?.title??scene.title).replace(/\n/g,' ')}{sceneIndex===index&&<em>현재</em>}</span>
   {scene.headline?.subtitle&&<small>{scene.headline.subtitle}</small>}
  </div>
 </li>)}</ol>
 </div></section>{course&&<nav aria-label="전체 교육 과정"><h3>전체 교육 과정</h3>{course.curriculum.chapters.map(ch=><details key={lesson.id+ch.no} open={ch.no===chapter}><summary>{String(ch.no).padStart(2,'0')}　{ch.title}<span>⌄</span></summary><ul>{ch.items.flatMap(i=>[row(i.lesson_id,i.no+' '+i.title),...(i.worked??[]).map(w=>row(w.lesson_id,w.title,true))])}</ul></details>)}</nav>}</aside>;}
