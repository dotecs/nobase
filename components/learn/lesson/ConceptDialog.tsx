'use client';
import { useEffect,useRef,useState } from 'react';
import type { ConceptCardData } from '@/lib/learn/lessons/concepts';
import { ConceptCard } from './ConceptCard';
import styles from './lesson.module.css';
export type ConceptLoader=(id:string)=>Promise<{data?:ConceptCardData;error?:string}>;
export function ConceptDialog({id,load,onClose}:{id:string;load:ConceptLoader;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);const [data,setData]=useState<ConceptCardData|null>(null),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;const element=dialog.current;element?.showModal();void load(id).then(result=>{if(!cancelled){setData(result.data??null);setError(result.error??(!result.data?'개념을 찾을 수 없습니다.':''));}}).catch(()=>{if(!cancelled)setError('개념을 불러오지 못했습니다.');});return()=>{cancelled=true;element?.close();};},[id,load]);
 return <dialog ref={dialog} className={styles.dialog} aria-label="개념 카드" onCancel={onClose} onClose={()=>{if(!dialog.current?.open)onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><button type="button" className={styles.close} onClick={onClose}>닫기</button>{error?<p role="alert">{error}</p>:data?<ConceptCard data={data}/>:<p role="status">개념을 불러오는 중입니다.</p>}</dialog>;
}
