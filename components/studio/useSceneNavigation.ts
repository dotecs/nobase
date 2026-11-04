'use client';
import { useEffect,useRef,useState } from 'react';
import type { Scene } from '@/lib/learn/lessons/schema';
import { sceneHash,sceneIndexFromHash } from '@/lib/learn/lessons/navigation';
export function useSceneNavigation(scenes:Scene[]){const [index,setIndex]=useState(0),[seen,setSeen]=useState<number[]>([]),[elapsed,setElapsed]=useState(0),started=useRef(0);
 const ids=scenes.map(s=>s.id).join('\u0001');
 useEffect(()=>{started.current=performance.now();const sync=()=>{const found=sceneIndexFromHash(scenes,window.location.hash),next=found<0?0:found;setIndex(next);setSeen(old=>old.includes(next)?old:[...old,next]);if(window.location.hash)window.history.replaceState(null,'',window.location.href);};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);// eslint-disable-next-line react-hooks/exhaustive-deps
 },[ids]);
 const markComplete=()=>setElapsed(performance.now()-started.current);
 const move=(next:number)=>{if(next<0||next>=scenes.length)return;setIndex(next);setSeen(old=>old.includes(next)?old:[...old,next]);window.history.pushState(null,'',sceneHash(scenes[next].id));};
 return {index,move,markComplete,seen,elapsed};
}
