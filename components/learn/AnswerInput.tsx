'use client';
import { Keypad,insertMathKey } from './Keypad';
export { eraseAnswer } from './Keypad';
import { useEffect,useRef } from 'react';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { AnswerType } from '@/lib/learn/types';
import { MathPreview } from './MathPreview';
import { useMathInputScope } from './MathInputScope';
import styles from './input.module.css';
export type AnswerValue=string|string[];
export function AnswerInput({type,options=[],value,onChange,disabled=false,relation_required=false,variable=null,alwaysExpanded=false}:{type:AnswerType;options?:{id:string;text_md:string}[];value:AnswerValue;onChange:(value:AnswerValue)=>void;disabled?:boolean;relation_required?:boolean;variable?:string|null;alwaysExpanded?:boolean}) {
 const inputRef=useRef<HTMLInputElement>(null),insertRef=useRef<(key:string)=>void>(()=>{}),scope=useMathInputScope();
 useEffect(()=>{if(inputRef.current)scope?.registerDefault({element:inputRef.current,insert:key=>insertRef.current(key)});},[scope,type]);
 if(type==='choice')return <fieldset className={styles.choices} disabled={disabled}><legend>답을 선택하세요</legend>{options.map(option=><button key={option.id} type="button" aria-pressed={Array.isArray(value)&&value.includes(option.id)} onClick={()=>{const selected=Array.isArray(value)?value:[];onChange(selected.includes(option.id)?selected.filter(id=>id!==option.id):[...selected,option.id]);}}>{Array.isArray(value)&&value.includes(option.id)&&<span aria-hidden="true">✓ </span>}{renderMathMarkdown(option.text_md)}</button>)}</fieldset>;
 const text=typeof value==='string'?value:'';
 if(type==='photo'||type==='text')return <label>풀이 설명{type==='photo'&&' (선택)'}<textarea className={styles.answer} rows={4} value={text} disabled={disabled} maxLength={4000} onChange={event=>onChange(event.target.value)}/></label>;
 const insert=(key:string)=>{const el=inputRef.current,next=insertMathKey(text,el?.selectionStart??text.length,el?.selectionEnd??text.length,key);onChange(next.text);requestAnimationFrame(()=>{el?.focus();el?.setSelectionRange(next.cursor,next.cursor);});};
 insertRef.current=insert;
 return <div className={styles.input}><label>답 입력<input ref={inputRef} className={styles.answer} type="text" inputMode="text" autoComplete="off" placeholder={relation_required?`예: ${variable??'x'}<=3`:undefined} value={text} disabled={disabled} maxLength={4000} onFocus={event=>scope?.activate({element:event.currentTarget,insert:key=>insertRef.current(key)})} onChange={event=>onChange(event.target.value)}/></label>
 <MathPreview value={text}/>
 {!scope&&<Keypad type={type} variable={variable??'x'} relationRequired={relation_required} onKey={insert} disabled={disabled} alwaysExpanded={alwaysExpanded}/>}</div>;
}
