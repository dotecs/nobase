'use client';
import { useState } from 'react';
import styles from './input.module.css';

export function eraseAnswer(text:string,start:number,end:number) {return {text:text.slice(0,start===end?Math.max(0,start-1):start)+text.slice(end),cursor:start===end?Math.max(0,start-1):start};}
export function Keypad({onKey,disabled=false,extended=false}:{onKey:(key:string)=>void;disabled?:boolean;extended?:boolean}) {
  const [page,setPage]=useState(0);
  const keys=page===1?['x','(',')','⌫','=','<','≤','^','>','≥','','']:['7','8','9','⌫','4','5','6','−','1','2','3','/','0','.','',''];
  return <div className={styles.input}>
    {extended&&<div className={styles.keypad} role="group" aria-label="키패드 페이지">{['숫자','문자·기호'].map((label,index)=><button type="button" key={label} aria-pressed={page===index} disabled={disabled} onClick={()=>setPage(index)}>{label}</button>)}</div>}
    <div className={styles.keypad} aria-label={page===1?'문자·기호 키패드':'숫자 키패드'}>{keys.map((key,index)=>key?<button key={index} type="button" aria-label={key==='⌫'?'한 글자 지우기':undefined} disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>onKey(key)}>{key}</button>:<span key={index} aria-hidden="true"/>)}</div>
  </div>;
}
