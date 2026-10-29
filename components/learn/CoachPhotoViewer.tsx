'use client';
import { useEffect,useRef,useState } from 'react';
import type { SessionPhoto } from '@/lib/learn/session-photos';
import { signedSessionPhotoUrl } from '@/app/(main)/learn/actions';
import styles from './coach-photo-viewer.module.css';
type Signer=(id:string)=>Promise<{url?:string;error?:string}>;
export function PhotoViewerContent({url,index,count,rotation,zoom,error,onRotate,onZoom,onMove,onClose}:{url:string;index:number;count:number;rotation:number;zoom:number;error:string;onRotate:()=>void;onZoom:()=>void;onMove:(delta:number)=>void;onClose:()=>void}) {
 return <><div className={styles.toolbar}><span>{index+1}/{count}</span><button type="button" onClick={onRotate}>회전(90°)</button><button type="button" onClick={onZoom}>확대 {zoom}×</button>{count>1&&<><button type="button" disabled={index===0} onClick={()=>onMove(-1)}>이전</button><button type="button" disabled={index===count-1} onClick={()=>onMove(1)}>다음</button></>}<button type="button" onClick={onClose}>닫기</button></div>
 <div className={styles.viewport}>{error?<p role="alert">{error}</p>:url?<div className={styles.stage} style={{width:`calc(min(80vw, 60vh) * ${zoom})`,height:`calc(min(80vw, 60vh) * ${zoom})`}}><img src={url} alt={`풀이 종이 ${index+1} 확대`} style={{transform:`rotate(${rotation}deg)`}}/></div>:<p role="status">사진을 불러오는 중이에요</p>}</div></>;
}
export function CoachPhotoViewer({photos,signUrl=signedSessionPhotoUrl}:{photos:SessionPhoto[];signUrl?:Signer}) {
 const [selected,setSelected]=useState<number|null>(null),[url,setUrl]=useState(''),[rotation,setRotation]=useState(0),[zoom,setZoom]=useState(1),[error,setError]=useState(''),[thumbnails,setThumbnails]=useState<Record<string,string>>({});
 const dialog=useRef<HTMLDialogElement>(null),request=useRef(0),retried=useRef(new Set<string>());
 const close=()=>{request.current++;setSelected(null);};
 useEffect(()=>{if(selected!==null){if(!dialog.current?.open)dialog.current?.showModal();}else if(dialog.current?.open)dialog.current.close();},[selected]);
 useEffect(()=>()=>{request.current++;},[]);
 async function open(index:number){
  const token=++request.current;setSelected(index);setUrl('');setError('');setRotation(0);setZoom(1);
  try{const result=await signUrl(photos[index].id);if(token!==request.current)return;if(result.url)setUrl(result.url);else setError(result.error??'사진을 불러오지 못했어요. 다시 열어 주세요.');}
  catch{if(token===request.current)setError('사진을 불러오지 못했어요. 다시 열어 주세요.');}
 }
 async function refreshThumbnail(photo:SessionPhoto){if(retried.current.has(photo.id))return;retried.current.add(photo.id);try{const result=await signUrl(photo.id);if(result.url)setThumbnails(current=>({...current,[photo.id]:result.url!}));}catch{/* Clicking still allows a fresh signed URL request. */}}
 return <><div className={styles.thumbnails}>{photos.map((photo,index)=><button type="button" key={photo.id} aria-label={`풀이 종이 ${index+1} 보기`} onClick={()=>void open(index)}><img src={thumbnails[photo.id]??photo.url} alt={`풀이 종이 ${index+1}`} width={200} height={200} onError={()=>void refreshThumbnail(photo)}/></button>)}</div>
 <dialog ref={dialog} className={styles.dialog} aria-label="풀이 사진 보기" onCancel={close} onClose={close} onClick={event=>{if(event.target===event.currentTarget)close();}}>{selected!==null&&<PhotoViewerContent url={url} index={selected} count={photos.length} rotation={rotation} zoom={zoom} error={error} onRotate={()=>setRotation(value=>(value+90)%360)} onZoom={()=>setZoom(value=>value===1?2:1)} onMove={delta=>void open(selected+delta)} onClose={close}/>}</dialog></>;
}
