'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft,FiArrowRight } from 'react-icons/fi';
import { InlineMath } from 'react-katex';
import { StandardGraph } from '@/components/learn/StandardGraph';
import { studioDemo } from '@/lib/learn/lessons/studio-demo';
import { buildTimeline,timelinePosition } from '@/lib/learn/lessons/timeline';
import StudioShell from './StudioShell';
import StudioPlayer from './StudioPlayer';
import styles from './demo.module.css';
const functions=[{expr:'a*x^2',c:'c1' as const}];
export default function StudioDemo(){
 const [index,setIndex]=useState(0),[manual,setManual]=useState<number|null>(null),scene=studioDemo.scenes[index],timeline=buildTimeline(scene);
 const move=(next:number)=>{if(next<0||next>=studioDemo.scenes.length)return;setManual(null);setIndex(next);};
 return <StudioPlayer key={scene.id} scene={scene} isLastScene={index===studioDemo.scenes.length-1} onPrevious={()=>move(index-1)} onNext={()=>move(index+1)} onResume={()=>setManual(null)} onSeek={()=>setManual(null)}>
  {({state,time,bar,pause,seek,ended})=>{const value=manual??state.params.a,display=manual===null?state:{...state,params:{a:value},points:state.points.map(p=>({...p,y:value*p.x*p.x}))};const explore=(value:number)=>{if(!Number.isFinite(value))return;pause();seek(timeline.entries[timelinePosition(timeline,time).index].startMs);setManual(Math.max(-3,Math.min(3,value)));};
   return <StudioShell scene={scene} stage={<StandardGraph variant="studio" state={display} x={[-4,4]} y={[-3,7]} fns={functions} aria="계수 a에 따른 이차함수 y=ax² 그래프"/>} player={bar}
    controls={<><div className={styles.formula}><InlineMath math="y=ax^2"/></div><div className={styles.value}><span>a = <strong>{Number(value.toFixed(2))}</strong></span><input type="number" aria-label="계수 a 값" min={-3} max={3} step={.1} value={Number(value.toFixed(2))} onChange={event=>explore(event.target.valueAsNumber)}/></div><input className={styles.slider} aria-label="계수 a 슬라이더" type="range" min={-3} max={3} step={.1} value={value} onChange={event=>explore(Number(event.target.value))}/><div className={styles.range}><span>−3</span><span>0</span><span>3</span></div></>}
    navigation={<div className={styles.nav}><button type="button" disabled={index===0} onClick={()=>move(index-1)}><FiArrowLeft aria-hidden="true"/>이전 내용</button><div className={styles.progress}><span aria-hidden="true" className={styles.dots}>{studioDemo.scenes.map((s,i)=><i key={s.id} data-active={index===i}/>)}</span><span>{String(index+1).padStart(2,'0')} <span>/ {String(studioDemo.scenes.length).padStart(2,'0')}</span></span></div>{index<studioDemo.scenes.length-1?<button type="button" className={styles.next} data-ended={ended} onClick={()=>move(index+1)}>다음 내용<FiArrowRight aria-hidden="true"/></button>:<Link className={styles.home} href="/learn">학습 홈<FiArrowRight aria-hidden="true"/></Link>}</div>}
   />;
  }}
 </StudioPlayer>;
}
