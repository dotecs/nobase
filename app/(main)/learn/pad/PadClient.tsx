'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { usePadSync } from '@/components/learn/usePadSync';
import { photoPromptRequired } from '@/lib/learn/steps-photo';
import Button from '@/components/Button/Button';
import { FocusShell } from '@/components/learn/FocusShell';
import { StepInput, nonemptySteps } from '@/components/learn/StepInput';
import { AnswerInput, type AnswerValue } from '@/components/learn/AnswerInput';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
import { submissionHelp } from '@/components/learn/submission-help';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { StudentItem } from '@/lib/learn/items';
import type { PadDraft } from '@/lib/learn/pad-draft';
import { submitAttempt, submitLearningAttempt, expireDiagnostic, expireSession } from '../actions';
import styles from '../learn.module.css';
import padStyles from '@/components/learn/pad.module.css';

export type PadQuestion={userId:string;sessionId:string;planIndex:number;item:StudentItem;photo_required:boolean;steps_photo_min_lines?:number|null;deadline:string;kind:string;current:number;total?:number;initialDraft?:PadDraft|null};
export function PadClient({userId,sessionId,planIndex,item,photo_required,steps_photo_min_lines,deadline,kind,current,total,initialDraft}:PadQuestion) {
  const [answer,setAnswer]=useState<AnswerValue>(initialDraft?.answer??(item.answer_type==='choice'?[]:'')),[steps,setSteps]=useState<string[]>(initialDraft?.steps??[]),[photo,setPhoto]=useState<string|null>(initialDraft?.photo_path??null);
  const [error,setError]=useState(''),[pending,start]=useTransition(),[remaining,setRemaining]=useState<number|null>(null);
  const router=useRouter(),started=useRef(0),expired=useRef(false);
  useEffect(()=>{started.current=Date.now();const tick=()=>{const left=Math.max(0,Date.parse(deadline)-Date.now());setRemaining(Math.ceil(left/1000));if(!left&&!expired.current){expired.current=true;start(async()=>{const result=await (kind==='diagnostic'?expireDiagnostic:expireSession)(sessionId);if(result.error)setError(result.error);else router.refresh();});}};tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);},[deadline,kind,router,sessionId]);
  const latestInput=useRef({answer,steps,photo_path:photo});latestInput.current={answer,steps,photo_path:photo};
  const sync=usePadSync({sessionId,planIndex,source:'pad',enabled:true,onDraft:draft=>{setAnswer(draft.answer);setSteps(draft.steps);setPhoto(draft.photo_path);}});
  const changeSteps=(value:string[])=>{setSteps(value);sync.edit({...latestInput.current,steps:value,source:'pad'});};
  const changePhoto=(value:string|null)=>{setPhoto(value);sync.edit({...latestInput.current,photo_path:value,source:'pad'});};
  const photoRequired=item.answer_type==='photo'&&photoPromptRequired(photo_required,steps_photo_min_lines,steps);
  const help=submissionHelp(item.answer_type,answer,photoRequired,photo,nonemptySteps(steps)),disabled=pending||remaining===0;
  const changeAnswer=(value:AnswerValue)=>{setAnswer(value);sync.edit({...latestInput.current,answer:value,source:'pad'});};
  return <FocusShell tone={kind==='diagnostic'?'diagnostic':kind==='review'?'review':'learning'} title={`입력 패드 · 문항 ${current}${total===undefined?'':`/${total}`}`} current={current} total={total} diagnostic={kind==='diagnostic'} remaining={remaining}>
    <div className={padStyles.controls}><Button size="sm" variant="outline" onClick={()=>{try{localStorage.removeItem('learn:pad-mode');}catch{/* Optional preference. */}router.push('/learn');}}>패드 모드 끄기</Button></div>
    <section className={`${styles.card} ${padStyles.pad}`}>
      <details className={padStyles.stem}><summary>문제 보기 ▸</summary><div className={styles.stem}>{renderMathMarkdown(item.stem_md)}</div></details>
      <StepInput value={steps} onChange={changeSteps} onCopy={changeAnswer} disabled={disabled}/>
      <AnswerInput type={item.answer_type} options={item.options} relation_required={item.relation_required} variable={item.variable} value={answer} onChange={changeAnswer} disabled={disabled}/>
      {item.answer_type==='photo'&&<PhotoCapture userId={userId} required={photoRequired} value={photo} onChange={changePhoto} disabled={disabled}/>}
      <Button fullWidth size="lg" disabled={disabled||!!help} onClick={()=>start(async()=>{setError('');await sync.flush();const result=await (kind==='diagnostic'?submitAttempt:submitLearningAttempt)({sessionId,itemId:item.id,planIndex,answer,steps:nonemptySteps(steps),photoPath:photo,durationMs:Math.min(2147483647,Math.max(0,Date.now()-started.current))});if(result.error)setError(result.error);else router.refresh();})}>{pending?'저장 중…':'답 제출'}</Button>
      {help&&<p className={styles.help}>{help}</p>}{(error||sync.error)&&<p role="alert">{error||sync.error}</p>}
    </section>
  </FocusShell>;
}
