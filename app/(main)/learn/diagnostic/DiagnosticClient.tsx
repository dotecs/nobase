'use client';
import { MathInputScope } from '@/components/learn/MathInputScope';
import { StepInput,nonemptySteps } from '@/components/learn/StepInput';
import { usePadSync } from '@/components/learn/usePadSync';
import { PadReceiver,usePadReceiver } from '@/components/learn/PadReceiver';
import { photoPromptRequired } from '@/lib/learn/steps-photo';
import Button from '@/components/Button/Button';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnswerInput, type AnswerValue } from '@/components/learn/AnswerInput';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { StudentItem } from '@/lib/learn/items';
import { submitAttempt, expireDiagnostic } from '../actions';
import { FocusShell } from '@/components/learn/FocusShell';
import { submissionHelp } from '@/components/learn/submission-help';
import { DiagnosticNotice } from './DiagnosticState';
import styles from '../learn.module.css';
export function DiagnosticClient({userId,sessionId,planIndex,item,photo_required,steps_photo_min_lines,deadline}:{userId:string;sessionId:string;planIndex:number;item:StudentItem;photo_required:boolean;steps_photo_min_lines?:number|null;deadline:string}) {
  const [answer,setAnswer]=useState<AnswerValue>(item.answer_type==='choice'?[]:''),[photo,setPhoto]=useState<string|null>(null),[error,setError]=useState(''),[pending,start]=useTransition();
  const [steps,setSteps]=useState<string[]>([]);
  const router=useRouter(),started=useRef(0),[remaining,setRemaining]=useState<number|null>(null),expired=useRef(false);
  useEffect(()=>{started.current=Date.now();const tick=()=>{const left=Math.max(0,Date.parse(deadline)-Date.now());setRemaining(Math.ceil(left/1000));if(!left&&!expired.current){expired.current=true;start(async()=>{const result=await expireDiagnostic(sessionId);if(result.error)setError(result.error);else router.refresh();});}};tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[deadline,sessionId,router]);
  const latestInput=useRef({answer,steps,photo_path:photo});latestInput.current={answer,steps,photo_path:photo};
  const receiver=usePadReceiver();
  const sync=usePadSync({sessionId,planIndex,source:'screen',enabled:receiver.enabled,onDraft:draft=>{setAnswer(draft.answer);setSteps(draft.steps);setPhoto(draft.photo_path);}});
  const changeAnswer=(value:AnswerValue)=>{setAnswer(value);sync.edit({...latestInput.current,answer:value,source:'screen'});};
  const changeSteps=(value:string[])=>{setSteps(value);sync.edit({...latestInput.current,steps:value,source:'screen'});};
  const changePhoto=(value:string|null)=>{setPhoto(value);sync.edit({...latestInput.current,photo_path:value,source:'screen'});};
  const photoRequired=item.answer_type==='photo'&&photoPromptRequired(photo_required,steps_photo_min_lines,steps);
  const help=submissionHelp(item.answer_type,answer,photoRequired,photo,nonemptySteps(steps));
  return <FocusShell title="출발점 진단" diagnostic current={planIndex+1} remaining={remaining} toolbar={<PadReceiver enabled={receiver.enabled} onToggle={receiver.toggle} status={sync.status}/>}><DiagnosticNotice planIndex={planIndex}/><section className={`${styles.card} ${styles.diagnosticCard}`}>
    <div className={styles.stem}>{renderMathMarkdown(item.stem_md)}</div>
    <MathInputScope type={item.answer_type} variable={item.variable} relationRequired={item.relation_required} disabled={pending||remaining===0}><StepInput value={steps} onChange={changeSteps} onCopy={changeAnswer} disabled={pending||remaining===0}/><AnswerInput type={item.answer_type} relation_required={item.relation_required} variable={item.variable} options={item.options} value={answer} onChange={changeAnswer} disabled={pending||remaining===0}/></MathInputScope>
    {item.answer_type==='photo'&&<PhotoCapture userId={userId} required={photoRequired} value={photo} onChange={changePhoto} disabled={pending||remaining===0}/>}
    <Button variant="primary" size="lg" fullWidth disabled={pending||remaining===0||!!help} onClick={()=>start(async()=>{setError('');await sync.flush();const result=await submitAttempt({sessionId,itemId:item.id,planIndex,answer,steps:nonemptySteps(steps),photoPath:photo,durationMs:Math.min(2147483647,Math.max(0,Date.now()-started.current))});if(result.error)setError(result.error);else router.refresh();})}>{pending?'저장 중…':'답 제출'}</Button>
    {help&&<p className={styles.help}>{help}</p>}{(error||sync.error)&&<p role="alert">{error||sync.error}</p>}
  </section></FocusShell>;
}
