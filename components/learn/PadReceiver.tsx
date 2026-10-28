'use client';
import { useEffect,useState } from 'react';
import styles from './pad.module.css';
export function usePadReceiver() {
  const [enabled,setEnabled]=useState(false);
  useEffect(()=>{try{setEnabled(localStorage.getItem('learn:receive-pad')==='1');}catch{/* Optional preference. */}},[]);
  return {enabled,toggle:(value:boolean)=>{setEnabled(value);try{localStorage.setItem('learn:receive-pad',value?'1':'0');}catch{/* Optional preference. */}}};
}
export function PadReceiver({enabled,onToggle,status}:{enabled:boolean;onToggle:(value:boolean)=>void;status:string}) {
  return <div className={styles.controls}><label><input type="checkbox" checked={enabled} onChange={event=>onToggle(event.target.checked)}/> 폰 입력 받기</label>{enabled&&<><span className={styles.status}>{status}</span><a href="/learn/pad" target="_blank" rel="noopener noreferrer">폰에서 nobase911.com/learn/pad 열기</a></>}</div>;
}
