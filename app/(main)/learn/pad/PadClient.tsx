'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button/Button';
import { FocusShell } from '@/components/learn/FocusShell';
import { StepInput, nonemptySteps } from '@/components/learn/StepInput';
import { AnswerInput, type AnswerValue } from '@/components/learn/AnswerInput';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
import { submissionHelp } from '@/components/learn/submission-help';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { StudentItem } from '@/lib/learn/items';
import type { PadDraft } from '@/lib/learn/pad-draft';
import { savePadDraft, submitAttempt, submitLearningAttempt, expireDiagnostic, expireSession } from '../actions';
import styles from '../learn.module.css';
import padStyles from '@/components/learn/pad.module.css';

export type PadQuestion={userId:string;sessionId:string;planIndex:number;item:StudentItem;photo_required:boolean;deadline:string;kind:string;current:number;total?:number;initialDraft?:PadDraft|null};
export function PadClient({userId,sessionId,planIndex,item,photo_required,deadline,kind,current,total,initialDraft}:PadQuestion) {
  const [answer,setAnswer]=useState<AnswerValue>(initialDraft?.answer??(item.answer_type==='choice'?[]:'')),[steps,setSteps]=useState<string[]>(initialDraft?.steps??[]),[photo,setPhoto]=useState<string|null>(initialDraft?.photo_path??null);
  const [error,setError]=useState(''),[pending,start]=useTransition(),[remaining,setRemaining]=useState<number|null>(null),[dirty,setDirty]=useState(false);
  const router=useRouter(),started=useRef(0),expired=useRef(false),saveQueue=useRef(Promise.resolve());
  useEffect(()=>{started.current=Date.now();const tick=()=>{const left=Math.max(0,Date.parse(deadline)-Date.now());setRemaining(Math.ceil(left/1000));if(!left&&!expired.current){expired.current=true;start(async()=>{const result=await (kind==='diagnostic'?expireDiagnostic:expireSession)(sessionId);if(result.error)setError(result.error);else router.refresh();});}};tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[deadline,kind,router,sessionId]);
  const timedOut=remaining===0;
  useEffect(()=>{
    if(!dirty||pending||timedOut)return;
    let live=true;
    const timer=setTimeout(()=>{const draft:PadDraft={answer,steps,photo_path:photo,source:'pad'};saveQueue.current=saveQueue.current.then(async()=>{const result=await savePadDraft({sessionId,planIndex,draft});if(live&&'error' in result)setError(result.error);}).catch(()=>{if(live)setError('입력을 저장하지 못했습니다. 다시 시도해 주세요.');});},300);
    return()=>{live=false;clearTimeout(timer);};
  },[answer,steps,photo,dirty,pending,sessionId,planIndex,timedOut]);
  const help=submissionHelp(item.answer_type,answer,photo_required,photo,nonemptySteps(steps)),disabled=pending||remaining===0;
  const changeAnswer=(value:AnswerValue)=>{setDirty(true);setAnswer(value);};
  return <FocusShell title={`입력 패드 · 문항 ${current}${total===undefined?'':`/${total}`}`} current={current} total={total} diagnostic={kind==='diagnostic'} remaining={remaining}>
    <div className={padStyles.controls}><Button size="sm" variant="outline" onClick={()=>{try{localStorage.removeItem('learn:pad-mode');}catch{/* Optional preference. */}router.push('/learn');}}>패드 모드 끄기</Button></div>
    <section className={`${styles.card} ${padStyles.pad}`}>
      <details className={padStyles.stem}><summary>문제 보기 ▸</summary><div className={styles.stem}>{renderMathMarkdown(item.stem_md)}</div></details>
      <StepInput value={steps} onChange={value=>{setDirty(true);setSteps(value);}} onCopy={changeAnswer} disabled={disabled}/>
      <AnswerInput type={item.answer_type} options={item.options} relation_required={item.relation_required} variable={item.variable} value={answer} onChange={changeAnswer} disabled={disabled}/>
      <PhotoCapture userId={userId} required={photo_required} onChange={value=>{setDirty(true);setPhoto(value);}} disabled={disabled}/>
      <Button fullWidth size="lg" disabled={disabled||!!help} onClick={()=>start(async()=>{setError('');await saveQueue.current;const result=await (kind==='diagnostic'?submitAttempt:submitLearningAttempt)({sessionId,itemId:item.id,planIndex,answer,steps:nonemptySteps(steps),photoPath:photo,durationMs:Math.min(2147483647,Math.max(0,Date.now()-started.current))});if(result.error)setError(result.error);else router.refresh();})}>{pending?'저장 중…':'답 제출'}</Button>
      {help&&<p className={styles.help}>{help}</p>}{error&&<p role="alert">{error}</p>}
    </section>
  </FocusShell>;
}
