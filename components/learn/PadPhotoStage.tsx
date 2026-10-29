'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FocusShell } from './FocusShell';
import { SessionPhotoPanel } from './SessionPhotoPanel';
import type { SessionPhoto } from '@/lib/learn/session-photos';
export function PadPhotoStage({sessionId,userId,kind,photos}:{sessionId:string;userId:string;kind:string;photos:SessionPhoto[]}) {
  const router=useRouter();
  useEffect(()=>{if(new URL(window.location.href).searchParams.get('session')!==sessionId)router.replace(`/learn/pad?session=${encodeURIComponent(sessionId)}`);},[router,sessionId]);
  return <FocusShell tone={kind==='diagnostic'?'diagnostic':kind==='review'?'review':'learning'} title={`풀이 종이 찍기 · ${kind==='diagnostic'?'출발점 진단':kind==='review'?'오늘의 복습':'오늘의 학습'}`}><SessionPhotoPanel sessionId={sessionId} userId={userId} kind={kind} initialPhotos={photos}/></FocusShell>;
}
