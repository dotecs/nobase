'use client';
import { useEffect,useRef,useState } from 'react';
import type { Scene } from '@/lib/learn/lessons/schema';
import { sceneHash,sceneIndexFromHash } from '@/lib/learn/lessons/navigation';
export function useSceneNavigation(scenes:Scene[]){const [index,setIndex]=useState(0),[complete,setComplete]=useState(false),[seen,setSeen]=useState<number[]>([]),[elapsed,setElapsed]=useState(0),started=useRef(0);
 useEffect(()=>{started.current=performance.now();const sync=()=>{const found=sceneIndexFromHash(scenes,window.location.hash),next=found<0?0:found;setIndex(next);setComplete(false);setSeen(old=>old.includes(next)?old:[...old,next]);};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[scenes]);
 const finish=()=>{setElapsed(performance.now()-started.current);setComplete(true);};
 const move=(next:number)=>{if(next<0||next>=scenes.length)return;setIndex(next);setComplete(false);setSeen(old=>old.includes(next)?old:[...old,next]);window.history.pushState(window.history.state,'',sceneHash(scenes[next].id));};
 return {index,move,complete,finish,seen,elapsed,returnToScene:()=>setComplete(false)};
}
