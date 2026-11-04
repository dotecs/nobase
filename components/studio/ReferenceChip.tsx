'use client';
import {FiCopy,FiCheck} from 'react-icons/fi';
import {useEffect,useRef,useState} from 'react';
import styles from './reference.module.css';
export function studioReference(lessonId:string,id:string){return `${lessonId}#${id}`;}
export async function copyStudioReference(lessonId:string,id:string,write:(value:string)=>Promise<void>){await write(studioReference(lessonId,id));}
export function ReferenceChip({lessonId,id,sentence=false}:{lessonId:string;id:string;sentence?:boolean}){
 const [status,setStatus]=useState(''),timer=useRef<ReturnType<typeof setTimeout>|null>(null),mounted=useRef(true),request=useRef(0);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current);};},[]);
 const copy=async()=>{const current=++request.current;if(timer.current)clearTimeout(timer.current);try{await copyStudioReference(lessonId,id,value=>navigator.clipboard.writeText(value));if(!mounted.current||current!==request.current)return;setStatus('복사됨');}catch{if(!mounted.current||current!==request.current)return;setStatus('복사 실패');}timer.current=setTimeout(()=>{if(mounted.current)setStatus('');},1000);};
 return <button type="button" className={styles.chip} data-studio-ref={sentence?'sentence':'scene'} title={studioReference(lessonId,id)} aria-label={`${sentence?'문장':'장면'} 참조 복사: ${studioReference(lessonId,id)}`} onClick={()=>void copy()}>{status==='복사됨'?<FiCheck aria-hidden="true"/>:<FiCopy aria-hidden="true"/>}<span aria-live="polite">{status||(sentence?id:studioReference(lessonId,id))}</span></button>;
}
