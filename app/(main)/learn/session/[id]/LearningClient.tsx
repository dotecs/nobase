'use client';
import { useEffect,useRef,useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnswerInput,type AnswerValue } from '@/components/learn/AnswerInput';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { StudentItem } from '@/lib/learn/items';
import type { Feedback } from '@/lib/learn/learning-session';
import { submitLearningAttempt,expireSession } from '../../actions';
import styles from '../../learn.module.css';
export function FeedbackPanel({feedback:f}:{feedback:Feedback|null}){if(!f)return null;return <div role="status"><strong>{f.result==='correct_independent'?'정답입니다.':f.result==='correct_assisted'?'도움을 받아 맞혔습니다.':f.result==='pending_review'?'코치가 풀이를 확인합니다.':'다시 확인해 보세요.'}</strong>{f.hint&&<div>{renderMathMarkdown(f.hint)}</div>}{f.can_retry&&<p>한 번 더 풀어보세요.</p>}{f.answer!==null&&<div>정답: {renderMathMarkdown(f.answer)}</div>}{f.explanation&&<div>{renderMathMarkdown(f.explanation)}</div>}</div>;}
export function LearningClient({userId,sessionId,planIndex,queueIndex,total,item,photo_required,deadline,feedback}:{userId:string;sessionId:string;planIndex:number;queueIndex:number;total:number;item:StudentItem;photo_required:boolean;deadline:string;feedback:Feedback|null}){
  const [answer,setAnswer]=useState<AnswerValue>(item.answer_type==='choice'?[]:''),[photo,setPhoto]=useState<string|null>(null),[error,setError]=useState(''),[pending,start]=useTransition(),[remaining,setRemaining]=useState<number|null>(null);
  const router=useRouter(),started=useRef(0),expired=useRef(false);
  useEffect(()=>{started.current=Date.now();const tick=()=>{const left=Math.max(0,Date.parse(deadline)-Date.now());setRemaining(Math.ceil(left/1000));if(!left&&!expired.current){expired.current=true;start(async()=>{const result=await expireSession(sessionId);if(result.error)setError(result.error);else router.refresh();});}};tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[deadline,sessionId,router]);
  return <section className={styles.card}><FeedbackPanel feedback={feedback}/><p>문항 {queueIndex+1} / {total} · 남은 시간 {remaining===null?'확인 중':`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`}</p><progress aria-label="학습 진행" value={queueIndex} max={total}/><div className={styles.stem}>{renderMathMarkdown(item.stem_md)}</div><AnswerInput type={item.answer_type} relation_required={item.relation_required} variable={item.variable} options={item.options} value={answer} onChange={setAnswer} disabled={pending||remaining===0}/><PhotoCapture userId={userId} required={photo_required} onChange={setPhoto} disabled={pending||remaining===0}/><button className={styles.button} disabled={pending||remaining===0||(photo_required&&!photo)} onClick={()=>start(async()=>{setError('');const result=await submitLearningAttempt({sessionId,itemId:item.id,planIndex,answer,photoPath:photo,durationMs:Math.min(2147483647,Math.max(0,Date.now()-started.current))});if(result.error)setError(result.error);else router.refresh();})}>{pending?'저장 중…':'답 제출'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
