'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import type { ConceptNode,ConceptEdge,LessonEvent } from '@/lib/learn/lessons/types';
import { answerTrace,initialTrace,traceConcepts } from '@/lib/learn/lessons/trace';
import { LessonText } from './LessonText';
import styles from './lesson.module.css';
export function ConceptTrace({start,nodes,edges,onEvent,onClose}:{start:string;nodes:ConceptNode[];edges:ConceptEdge[];onEvent:(event:LessonEvent)=>void;onClose:()=>void}){
 const chain=traceConcepts(start,nodes,edges),[state,setState]=useState(initialTrace),root=useRef<HTMLElement>(null);
 useEffect(()=>{root.current?.focus({preventScroll:true});},[]);
 const node=chain[state.index],gap=chain.find(n=>n.id===state.gap);
 const answer=(correct:boolean,option_id?:string)=>{const next=answerTrace(chain,state,correct);setState(next);onEvent({type:'quiz',payload:{kind:'concept_check',concept_id:node.id,option_id,correct,path:next.path}});if(next.gap)onEvent({type:'gap',payload:{concept_id:next.gap,path:next.path}});};
 return <aside ref={root} tabIndex={-1} className={styles.scene} aria-label="어디서 막혔는지 확인"><h2>한 단계씩 확인해요</h2>
  {!chain.length?<p>이 개념의 확인 자료가 아직 준비되지 않았습니다.</p>:state.finished?<div role="status">{gap?<><p><strong>{gap.name}</strong>부터 다시 살펴보면 좋아요.</p><Link href={'/learn/concept/'+gap.id}>개념 카드 보기</Link>{gap.lesson_id&&<Link href={'/learn/lesson/'+gap.lesson_id}>연결된 레슨 보기</Link>}</>:<p>확인한 개념은 알고 있어요. 개념을 연결하는 연습을 해 봐요.</p>}</div>:<div className={styles.quiz}><p>{state.index+1} / {chain.length} · {node.name}</p>{node.check_question?<><LessonText authored text={node.check_question.stem_md}/>{node.check_question.options.map(option=><button key={option.id} type="button" onClick={()=>answer(option.id===node.check_question!.correct,option.id)}><LessonText authored text={option.text_md}/></button>)}</>:<><p>{node.name}을 설명할 수 있나요?</p><button type="button" onClick={()=>answer(true)}>설명할 수 있어요</button></>}<button type="button" onClick={()=>answer(false)}>잘 모르겠어요</button></div>}
  <button type="button" onClick={onClose}>확인 닫기</button>
 </aside>;
}
