'use client';
import Button from '@/components/Button/Button';
import { useEffect,useRef,useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnswerInput,type AnswerValue } from '@/components/learn/AnswerInput';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { StudentItem } from '@/lib/learn/items';
import type { Feedback } from '@/lib/learn/learning-session';
import { submitLearningAttempt,expireSession } from '../../actions';
import { FeedbackPanel } from '@/components/learn/FeedbackPanel';
import { FocusShell } from '@/components/learn/FocusShell';
import { submissionHelp } from '@/components/learn/submission-help';
import styles from '../../learn.module.css';
export function LearningClient({userId,sessionId,planIndex,queueIndex,total,item,photo_required,deadline,feedback,kind}:{userId:string;sessionId:string;planIndex:number;queueIndex:number;total:number;item:StudentItem;photo_required:boolean;deadline:string;feedback:Feedback|null;kind?:string}){
  const [answer,setAnswer]=useState<AnswerValue>(item.answer_type==='choice'?[]:''),[photo,setPhoto]=useState<string|null>(null),[error,setError]=useState(''),[pending,start]=useTransition(),[remaining,setRemaining]=useState<number|null>(null);
  const router=useRouter(),started=useRef(0),expired=useRef(false);
  useEffect(()=>{started.current=Date.now();const tick=()=>{const left=Math.max(0,Date.parse(deadline)-Date.now());setRemaining(Math.ceil(left/1000));if(!left&&!expired.current){expired.current=true;start(async()=>{const result=await expireSession(sessionId);if(result.error)setError(result.error);else router.refresh();});}};tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[deadline,sessionId,router]);
  const help=submissionHelp(item.answer_type,answer,photo_required,photo);
  return <FocusShell title={kind==='review'?'오늘의 복습':'오늘의 학습'} current={queueIndex+1} total={total} remaining={remaining}><FeedbackPanel feedback={feedback} currentPlanIndex={planIndex}/><section className={styles.card}><div className={styles.stem}>{renderMathMarkdown(item.stem_md)}</div>{feedback?.can_retry&&<p className={styles.help}>다시 풀기</p>}<AnswerInput type={item.answer_type} relation_required={item.relation_required} variable={item.variable} options={item.options} value={answer} onChange={setAnswer} disabled={pending||remaining===0}/><PhotoCapture userId={userId} required={photo_required} onChange={setPhoto} disabled={pending||remaining===0}/><Button variant="primary" size="lg" fullWidth disabled={pending||remaining===0||!!help} onClick={()=>start(async()=>{setError('');const result=await submitLearningAttempt({sessionId,itemId:item.id,planIndex,answer,photoPath:photo,durationMs:Math.min(2147483647,Math.max(0,Date.now()-started.current))});if(result.error)setError(result.error);else router.refresh();})}>{pending?'저장 중…':'답 제출'}</Button>{help&&<p className={styles.help}>{help}</p>}{error&&<p role="alert">{error}</p>}</section></FocusShell>;
}
