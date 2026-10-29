'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button/Button';
import { PhotoCapture } from './PhotoCapture';
import type { SessionPhoto } from '@/lib/learn/session-photos';
import styles from './session-photos.module.css';
export function DiagnosticStepper({hasPhotos}:{hasPhotos:boolean}) {
  return <ol className={styles.stepper} aria-label="진단 진행 단계"><li>1 풀기 ✓</li><li aria-current={!hasPhotos?'step':undefined}>2 사진 올리기{hasPhotos?' ✓':''}</li><li aria-current={hasPhotos?'step':undefined}>3 코치 확인</li></ol>;
}
export function SessionPhotoPanel({sessionId,userId,kind,initialPhotos}:{sessionId:string;userId:string;kind:string;initialPhotos:SessionPhoto[]}) {
  const [photos,setPhotos]=useState(initialPhotos),router=useRouter(),diagnostic=kind==='diagnostic';
  useEffect(()=>setPhotos(initialPhotos),[initialPhotos]);
  return <section className={styles.panel} aria-label="세션 풀이 사진">
    {diagnostic&&<DiagnosticStepper hasPhotos={photos.length>0}/>}
    <h2>{diagnostic?(photos.length?'진단을 마쳤어요':'마지막으로, 풀이 종이를 찍어 주세요'):'풀이 종이가 있다면 올려 주세요'}</h2>
    {diagnostic&&photos.length>0?<p>코치가 확인하면 학습 홈에서 시작할 수 있어요</p>:<p>종이에 문제 번호가 보이게 찍어 주세요</p>}
    <p>최대 4장 · {photos.length}/4장</p>
    <SessionPhotoThumbnails photos={photos}/>
    {photos.length<4&&<PhotoCapture userId={userId} sessionId={sessionId} required={diagnostic&&!photos.length} onChange={()=>{}} onSessionPhotos={next=>{setPhotos(next);router.refresh();}}/>}
    {diagnostic?(photos.length?<Button href="/learn" size="lg" fullWidth>진단 끝내기</Button>:<Button size="lg" fullWidth disabled>진단 끝내기</Button>):<Button href="/learn" size="lg" fullWidth variant={photos.length?'primary':'outline'}>{photos.length?'학습 홈으로':'다음에 올리기'}</Button>}
  </section>;
}
export function SessionPhotoThumbnails({photos}:{photos:SessionPhoto[]}) {
  return <div className={styles.thumbnails}>{photos.map((photo,i)=><a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer"><img src={photo.url} alt={`풀이 종이 ${i+1}`} width={120} height={120}/></a>)}</div>;
}
