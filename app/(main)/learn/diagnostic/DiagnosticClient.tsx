'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnswerInput, type AnswerValue } from '@/components/learn/AnswerInput';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { StudentItem } from '@/lib/learn/items';
import { submitAttempt, expireDiagnostic } from '../actions';
import styles from '../learn.module.css';
export function DiagnosticClient({userId,sessionId,planIndex,item,photo_required,deadline}:{userId:string;sessionId:string;planIndex:number;item:StudentItem;photo_required:boolean;deadline:string}) {
  const [answer,setAnswer]=useState<AnswerValue>(item.answer_type==='choice'?[]:''),[photo,setPhoto]=useState<string|null>(null),[error,setError]=useState(''),[pending,start]=useTransition();
  const router=useRouter(),started=useRef(0),[remaining,setRemaining]=useState<number|null>(null),expired=useRef(false);
  useEffect(()=>{started.current=Date.now();const tick=()=>{const left=Math.max(0,Date.parse(deadline)-Date.now());setRemaining(Math.ceil(left/1000));if(!left&&!expired.current){expired.current=true;start(async()=>{const result=await expireDiagnostic(sessionId);if(result.error)setError(result.error);else router.refresh();});}};tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[deadline,sessionId,router]);
  return <section className={styles.card}><p>문항 {planIndex+1} · 남은 시간 {remaining===null?'확인 중':`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`}</p>
    <div className={styles.stem}>{renderMathMarkdown(item.stem_md)}</div>
    <AnswerInput type={item.answer_type} relation_required={item.relation_required} variable={item.variable} options={item.options} value={answer} onChange={setAnswer} disabled={pending||remaining===0}/>
    <PhotoCapture userId={userId} required={photo_required} onChange={setPhoto} disabled={pending||remaining===0}/>
    <button className={styles.button} disabled={pending||remaining===0||(photo_required&&!photo)} onClick={()=>start(async()=>{setError('');const result=await submitAttempt({sessionId,itemId:item.id,planIndex,answer,photoPath:photo,durationMs:Math.min(2147483647,Math.max(0,Date.now()-started.current))});if(result.error)setError(result.error);else router.refresh();})}>{pending?'저장 중…':'답 제출'}</button>
    <p>진단 중에는 정오답을 표시하지 않습니다.</p>{error&&<p role="alert">{error}</p>}
  </section>;
}
