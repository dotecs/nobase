'use client';
import { memo,useEffect,useId,useRef,useState } from 'react';
import type { GraphStage } from '@/lib/learn/lessons/schema';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import { curvePath } from '@/lib/learn/lessons/graph';
import {equalGraph,spacedTicks} from '@/lib/learn/lessons/equal-graph';
import {ChalkLayer} from './ChalkLayer';
import { renderMathMarkdown } from '@/lib/math-markdown';
import styles from './graph.module.css';
const colors={c1:'var(--studio-accent)',c2:'var(--color-secondary-400)',c3:'var(--color-warning)'};
const number=(value:number)=>Number(value.toFixed(3)).toString();
export const StudioGraph=memo(function StudioGraph({fns,aria,state,aspect='equal'}:{fns:GraphStage['fns'];aria:string;state:StageState;aspect?:'equal'|'free'}){
 const ref=useRef<HTMLDivElement>(null),id=useId().replace(/:/g,''),[size,setSize]=useState({width:1200,height:750});
 useEffect(()=>{if(!ref.current||typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(([entry])=>{const width=Math.min(1200,Math.max(200,Math.round(entry.contentRect.width))),height=Math.min(750,Math.max(160,Math.round(entry.contentRect.height)));setSize(old=>old.width===width&&old.height===height?old:{width,height});});observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const viewport={...size,left:30,right:24,top:24,bottom:28},{x,y,sx,sy,unitX,unitY}=equalGraph(state.camera,viewport,aspect),right=size.width-viewport.right,bottom=size.height-viewport.bottom;
 const opacity=(target:string)=>(state.highlight?.length&&state.dimOthers&&!state.highlight.includes(target)?0.22:1)*(1-.4*(state.pulses[target]??0));
 const hasX=y[0]<=0&&y[1]>=0,hasY=x[0]<=0&&x[1]>=0;
 return <div ref={ref} className={styles.container}><svg className={styles.graph} viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={aria} data-unit-x={unitX} data-unit-y={unitY}>
  <defs><filter id={id+'glow'} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter><clipPath id={id+'clip'}><rect x={viewport.left} y={viewport.top} width={right-viewport.left} height={bottom-viewport.top}/></clipPath></defs>
  <g className={styles.grid}>{spacedTicks(x,unitX).map(t=><line key={'x'+t} x1={sx(t)} x2={sx(t)} y1={viewport.top} y2={bottom}/>)}{spacedTicks(y,unitY).map(t=><line key={'y'+t} y1={sy(t)} y2={sy(t)} x1={viewport.left} x2={right}/>)}</g>
  {state.band&&!state.chalk?.some(m=>m.id==='legacy-band')&&<rect className={styles.band} data-target="band" style={{opacity:.24*opacity('band')}} x={viewport.left} y={sy(Math.min(y[1],Math.max(...state.band)))} width={right-viewport.left} height={Math.max(0,sy(Math.max(y[0],Math.min(...state.band)))-sy(Math.min(y[1],Math.max(...state.band))))}/>}
  <g className={styles.axes}>
   {hasX&&<g opacity={opacity('axis:x')}><line x1={viewport.left} x2={right} y1={sy(0)} y2={sy(0)}/><polygon points={`${right},${sy(0)} ${right-10},${sy(0)-4} ${right-10},${sy(0)+4}`}/><text className={styles.axisName} x={right-6} y={sy(0)-14}>x</text>{spacedTicks(x,unitX).filter(t=>t!==0&&t>x[0]&&t<x[1]).map(t=><text className={styles.tick} key={t} x={sx(t)} y={sy(0)+24} textAnchor="middle">{t}</text>)}</g>}
   {hasY&&<g opacity={opacity('axis:y')}><line x1={sx(0)} x2={sx(0)} y1={bottom} y2={viewport.top}/><polygon points={`${sx(0)},${viewport.top} ${sx(0)-4},${viewport.top+10} ${sx(0)+4},${viewport.top+10}`}/><text className={styles.axisName} x={sx(0)+14} y={viewport.top+12}>y</text>{spacedTicks(y,unitY).filter(t=>t!==0&&t>y[0]&&t<y[1]).map(t=><text className={styles.tick} key={t} x={sx(0)-14} y={sy(t)+5} textAnchor="end">{t}</text>)}</g>}
   {hasX&&hasY&&<text className={styles.tick} x={sx(0)-8} y={sy(0)+24} textAnchor="end">0</text>}
  </g>
  <g clipPath={`url(#${id}clip)`}>{state.visibleFns.map(i=>{const fn=fns[i];if(!fn)return null;const target='fn:'+i,d=curvePath(fn.expr,x,y,state.params,viewport),progress=Math.max(0,Math.min(1,state.drawProgress[target]??1));return <g key={i} opacity={opacity(target)} data-target={target}><path d={d} className={styles.glow} stroke={colors[fn.c]} pathLength={1} strokeDasharray={1} strokeDashoffset={1-progress} filter={`url(#${id}glow)`}/><path d={d} className={styles.curve} stroke={colors[fn.c]} pathLength={1} strokeDasharray={1} strokeDashoffset={1-progress}/></g>;})}</g>
  {state.points.filter(p=>Number.isFinite(p.y)&&p.x>=x[0]&&p.x<=x[1]&&p.y>=y[0]&&p.y<=y[1]).map(p=><g key={p.id} data-target={p.id} opacity={opacity(p.id)}><circle className={styles.point} cx={sx(p.x)} cy={sy(p.y)} r={6} fill={colors[p.c??'c1']}/><rect className={styles.pointChip} x={sx(p.x)+9} y={sy(p.y)-40} width={Math.max(44,Array.from(p.label??`(${number(p.x)}, ${number(p.y)})`).length*14+12)} height={34} rx={6}/><text className={styles.pointLabel} x={sx(p.x)+14} y={sy(p.y)-14}>{p.label??`(${number(p.x)}, ${number(p.y)})`}</text></g>)}
  {state.labels.map((label,i)=><foreignObject key={i} x={sx(label.at.x)-(label.anchor==='end'?240:label.anchor==='middle'?120:0)} y={sy(label.at.y)-18} width={240} height={64} overflow="visible"><div className={styles.label} style={{textAlign:label.anchor==='end'?'right':label.anchor==='middle'?'center':'left'}}>{label.tex?renderMathMarkdown('$'+label.tex+'$'):label.text}</div></foreignObject>)}
  <ChalkLayer marks={state.chalk??[]} space={{x,y,sx,sy,fns,params:state.params,target:target=>{const point=state.points.find(p=>p.id===target);if(point)return {x:sx(point.x),y:sy(point.y),left:sx(point.x)-8,right:sx(point.x)+8,top:sy(point.y)-8,bottom:sy(point.y)+8};if(target.startsWith('fn:')||target.startsWith('axis:'))return {x:(viewport.left+right)/2,y:(viewport.top+bottom)/2,left:viewport.left,right,top:viewport.top,bottom};return null;}}}/>
 </svg></div>;
});
