'use client';
import { useEffect, useRef, useState } from 'react';
import { Keypad, eraseAnswer } from './Keypad';
import styles from './input.module.css';

export function nonemptySteps(lines:string[]) {return lines.filter(line=>line.trim().length>0);}
export function appendStep(lines:string[]) {return lines.length<12?[...lines,'']:lines;}
export function StepInput({value,onChange,onCopy,disabled=false}:{value:string[];onChange:(lines:string[])=>void;onCopy:(line:string)=>void;disabled?:boolean}) {
  const [open,setOpen]=useState(false),[active,setActive]=useState(0);
  const refs=useRef<(HTMLInputElement|null)[]>([]);
  const lines=value.length?value:[''];
  useEffect(()=>{try{setOpen(localStorage.getItem('learn:steps-open')==='1');}catch{/* Storage may be unavailable. */}},[]);
  const focus=(index:number)=>requestAnimationFrame(()=>refs.current[index]?.focus());
  const change=(index:number,text:string)=>onChange(lines.map((line,i)=>i===index?text.slice(0,200):line));
  const add=()=>{if(lines.length>=12)return;onChange(appendStep(lines));setActive(lines.length);focus(lines.length);};
  const insert=(key:string)=>{
    const index=Math.min(active,lines.length-1),el=refs.current[index],line=lines[index];
    const start=el?.selectionStart??line.length,end=el?.selectionEnd??line.length;
    const next=key==='⌫'?eraseAnswer(line,start,end):{text:line.slice(0,start)+key+line.slice(end),cursor:start+key.length};
    change(index,next.text);requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(next.cursor,next.cursor);});
  };
  return <section className={styles.steps} aria-label="풀이 과정 (선택)">
    <p>풀이 과정 (선택)</p>
    <button type="button" className={styles.stepButton} aria-expanded={open} onClick={()=>{setOpen(!open);try{localStorage.setItem('learn:steps-open',open?'0':'1');}catch{/* Optional preference only. */}}}>{open?'풀이 과정 접기 ▾':'풀이 과정 적기 ▸'}</button>
    {open&&<div className={styles.input}>
      {lines.map((line,index)=><div className={styles.stepRow} key={index}><span aria-hidden="true">{index+1}</span><input ref={el=>{refs.current[index]=el;}} className={styles.answer} aria-label={`풀이 ${index+1}번째 줄`} type="text" inputMode="text" autoComplete="off" maxLength={200} value={line} disabled={disabled} onFocus={()=>setActive(index)} onChange={event=>change(index,event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();add();}}}/><button className={styles.stepButton} type="button" aria-label={`${index+1}번째 줄 삭제`} disabled={disabled} onClick={()=>{const next=lines.filter((_,i)=>i!==index);onChange(next.length?next:['']);setActive(Math.max(0,index-1));focus(Math.max(0,index-1));}}>⌫</button></div>)}
      <Keypad extended onKey={insert} disabled={disabled}/>
      <div className={styles.stepActions}><button className={styles.stepButton} type="button" disabled={disabled||lines.length>=12} onClick={add}>줄 추가</button><button className={styles.stepButton} type="button" disabled={disabled||!lines.at(-1)?.trim()} onClick={()=>onCopy(lines.at(-1)!)}>이 줄을 답으로</button></div>
    </div>}
  </section>;
}
