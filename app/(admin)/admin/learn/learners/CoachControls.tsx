'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import styles from './learners.module.css';
type Action=(input:unknown)=>Promise<{error?:string;message?:string}>;
function useAction(action:Action) {
  const [pending,start]=useTransition(),[message,setMessage]=useState(''),request=useRef<{requestId:string;eventAt:string;input:string}|null>(null),router=useRouter();
  const run=(input:Record<string,unknown>)=>start(async()=>{const serialized=JSON.stringify(input);if(!request.current||request.current.input!==serialized)request.current={requestId:crypto.randomUUID(),eventAt:new Date().toISOString(),input:serialized};try{const result=await action({...input,requestId:request.current.requestId,eventAt:request.current.eventAt});setMessage(result.error??result.message??'저장했습니다.');if(!result.error){request.current=null;router.refresh();}}catch{setMessage('저장 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도해 주세요.');}});
  return {pending,message,run};
}
export function CoachGateControls({userId,status,abilities,action,latestDiagnosticPhotoCount=0}:{latestDiagnosticPhotoCount?:number;userId:string;status:string;abilities:{id:string;name:string}[];action:Action}) {
  const {pending,message,run}=useAction(action),[note,setNote]=useState(''),[ability,setAbility]=useState(abilities[0]?.id??''),[state,setState]=useState('learning'),[confirmReset,setConfirmReset]=useState(false);
  return <section className={styles.card}><h2>코치 게이트</h2><div className={styles.controls}><label>검토 메모 / 변경 사유<textarea value={note} onChange={event=>setNote(event.target.value)} disabled={pending}/></label>
    <button disabled={pending||status!=='awaiting_coach'||latestDiagnosticPhotoCount===0} onClick={()=>run({kind:'diagnostic_gate',userId,note})}>학습 열기</button>
    {status==='awaiting_coach'&&latestDiagnosticPhotoCount===0&&<><p>학생이 풀이 사진을 올리면 열 수 있어요</p><button disabled={pending||!note.trim()} onClick={()=>run({kind:'diagnostic_gate',userId,note,withoutPhoto:true})}>사진 없이 열기</button></>}
    <label>소주제<select value={ability} onChange={event=>setAbility(event.target.value)}>{abilities.map(row=><option key={row.id} value={row.id}>{row.id} {row.name}</option>)}</select></label>
    <label>변경할 상태<select value={state} onChange={event=>setState(event.target.value)}><option value="unknown">미확인</option><option value="needs_repair">보완 필요</option><option value="learning">학습 중</option><option value="verified">검증</option><option value="retained">유지</option><option value="recheck">재검증</option></select></label>
    <button disabled={pending||!note.trim()||!ability} onClick={()=>run({kind:'state_override',userId,abilityId:ability,state,note})}>사유와 함께 상태 변경</button>
    <button disabled={pending} onClick={()=>setConfirmReset(value=>!value)}>진단 다시</button>
    {confirmReset&&<div role="group" aria-label="진단 재시작 확인"><p>기존 기록은 보존하고 소주제 상태를 초기화합니다. 새 진단을 시작하도록 할까요?</p><button disabled={pending||!note.trim()} onClick={()=>run({kind:'restart_diagnostic',userId,note})}>사유를 남기고 새 진단 허용</button></div>}
    {message&&<p role="status">{message}</p>}</div></section>;
}
export function CoachReviewControl({userId,attemptId,action}:{userId:string;attemptId:string;action:Action}) {
  const {pending,message,run}=useAction(action),[verdict,setVerdict]=useState('correct'),[note,setNote]=useState('');
  return <div className={styles.controls}><label>코치 판정<select value={verdict} disabled={pending} onChange={event=>setVerdict(event.target.value)}><option value="correct">정답</option><option value="partial">부분 정답</option><option value="incorrect">오답</option></select></label><label>검토 메모<textarea value={note} disabled={pending} onChange={event=>setNote(event.target.value)}/></label><button disabled={pending} onClick={()=>run({kind:'review_attempt',userId,attemptId,verdict,note})}>판정 저장</button>{message&&<p role="status">{message}</p>}</div>;
}
