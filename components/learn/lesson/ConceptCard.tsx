'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { ConceptCardData } from '@/lib/learn/lessons/concepts';
import { LessonText } from './LessonText';
import styles from './lesson.module.css';
export function ConceptCard({data}:{data:ConceptCardData}){
 const {node,parents,children,lessonHref}=data;const [choice,setChoice]=useState<string|null>(null);
 return <article className={styles.scene}><h2>{node.name}</h2><LessonText authored text={node.one_line}/>{lessonHref&&<p><Link href={lessonHref}>설명 장면으로 가기</Link></p>}
 <h3>먼저 알아둘 개념</h3>{parents.length?parents.map(n=><Link key={n.id} href={'/learn/concept/'+n.id}>{n.name}</Link>):<p>연결된 선행 개념이 없습니다.</p>}
 <h3>이어지는 개념</h3>{children.length?children.map(n=><Link key={n.id} href={'/learn/concept/'+n.id}>{n.name}</Link>):<p>연결된 후속 개념이 없습니다.</p>}
 {node.check_question&&<section className={styles.quiz}><h3>개념 확인</h3><LessonText authored text={node.check_question.stem_md}/>{node.check_question.options.map(o=><button type="button" key={o.id} aria-pressed={choice===o.id} onClick={()=>setChoice(o.id)}><LessonText authored text={o.text_md}/></button>)}{choice&&<p role="status">{choice===node.check_question.correct?'맞았어요.':'개념 설명을 다시 살펴봐요.'}</p>}</section>}
 </article>;
}
