'use client';
import { useEffect,useState } from 'react';
import type { AnswerType } from '@/lib/learn/types';
import styles from './input.module.css';
export function eraseAnswer(text:string,start:number,end:number) {return {text:text.slice(0,start===end?Math.max(0,start-1):start)+text.slice(end),cursor:start===end?Math.max(0,start-1):start};}
export function insertMathKey(text:string,start:number,end:number,key:string,maxLength=4000) {
 if(key==='⌫')return eraseAnswer(text,start,end);
 const value=key==='|x|'?'||':key,next=(text.slice(0,start)+value+text.slice(end)).slice(0,maxLength);
 return {text:next,cursor:Math.min(next.length,start+(key==='|x|'?1:value.length))};
}
export function keypadKeys(page:number,type:AnswerType='expression',relationRequired=false,variable='x') {
 const keys=page===0?['7','8','9','⌫','4','5','6','−','1','2','3','/','0','.','(',')']:page===1?[variable,'(',')','^','√','π','≤','≥','<','>','=','×','|','|','⌫','']:['log(','ln(','sqrt(','root(','sin(','cos(','tan(','|x|','°','⌫','',''];
 return keys.map(key=>!relationRequired&&(type==='number'||type==='fraction')&&['<','>','≤','≥','='].includes(key)?'':key);
}
export function Keypad({onKey,disabled=false,type='expression',relationRequired=false,variable='x',alwaysExpanded=false}:{onKey:(key:string)=>void;disabled?:boolean;type?:AnswerType;relationRequired?:boolean;variable?:string;alwaysExpanded?:boolean}) {
 const [page,setPage]=useState(0),[collapsed,setCollapsed]=useState(false);
 useEffect(()=>{if(!alwaysExpanded)try{setCollapsed(localStorage.getItem('learn.keypad.collapsed')==='1');}catch{}},[alwaysExpanded]);
 return <div className={styles.input}>
  {!alwaysExpanded&&<button type="button" className={styles.stepButton} aria-expanded={!collapsed} onClick={()=>{setCollapsed(!collapsed);try{localStorage.setItem('learn.keypad.collapsed',collapsed?'0':'1');}catch{}}}>{collapsed?'키패드 펼치기':'키패드 접기'}</button>}
  {(alwaysExpanded||!collapsed)&&<><div className={styles.keypadTabs} role="group" aria-label="키패드 페이지">{['숫자','기호','함수'].map((label,index)=><button type="button" key={label} aria-pressed={page===index} disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>setPage(index)}>{label}</button>)}</div>
  <div className={styles.keypad} aria-label={['숫자','기호','함수'][page]+' 키패드'}>{keypadKeys(page,type,relationRequired,variable).map((key,index)=>key?<button key={index} type="button" aria-label={key==='⌫'?'한 글자 지우기':undefined} disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>onKey(key)}>{key}</button>:<span key={index} aria-hidden="true"/>)}</div></>}
 </div>;
}
