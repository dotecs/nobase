'use client';
import { useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { readPadDraft,savePadDraft } from '@/app/(main)/learn/actions';
import { createPadSync,padConnectionLabel } from '@/lib/learn/pad-sync';
import type { PadDraft } from '@/lib/learn/pad-draft';
export function usePadSync({sessionId,planIndex,source,enabled,onDraft}:{sessionId:string;planIndex:number;source:'pad'|'screen';enabled:boolean;onDraft:(draft:PadDraft)=>void}) {
  const router=useRouter(),apply=useRef(onDraft),engine=useRef<ReturnType<typeof createPadSync>|null>(null);
  apply.current=onDraft;
  const [error,setError]=useState(''),[lastPad,setLastPad]=useState<string|null>(null),[now,setNow]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    const instance=createPadSync({source,planIndex,read:()=>readPadDraft({sessionId,planIndex}),save:draft=>savePadDraft({sessionId,planIndex,draft}),onDraft:draft=>apply.current(draft),onProgress:()=>router.refresh(),onStatus:setLastPad,onError:setError});
    engine.current=instance;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>{instance.stop();engine.current=null;clearInterval(timer);};
  },[enabled,sessionId,planIndex,source,router]);
  return {edit:(draft:PadDraft)=>engine.current?.edit(draft),flush:()=>engine.current?.flush()??Promise.resolve(),error,status:padConnectionLabel(lastPad,now)};
}
