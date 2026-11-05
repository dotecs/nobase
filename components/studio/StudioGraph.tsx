'use client';
import {RegionLayer} from './RegionLayer';
import {regionGeometry,regionTargets} from '@/lib/learn/lessons/region';
import {GraphPointLabels} from './GraphPointLabels';
import {labelBox} from '@/lib/learn/lessons/point-labels';
import {tickValue} from '@/lib/learn/lessons/pointing';
import {BoardItems} from './BoardItems';
import {useTargetBoxes} from './useTargetBoxes';
import type {BoardItem} from '@/lib/learn/lessons/items';
import {InlineMath} from 'react-katex';
import {formatExact} from '@/lib/learn/lessons/format-num';
import { memo,useEffect,useId,useRef,useState } from 'react';
import type { GraphStage } from '@/lib/learn/lessons/schema';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import { curvePath } from '@/lib/learn/lessons/graph';
import {equalGraph,spacedTicks} from '@/lib/learn/lessons/equal-graph';
import {CalloutLayer} from './CalloutLayer';
import type {ChalkSpace} from '@/lib/learn/lessons/chalk';
import {ChalkLayer} from './ChalkLayer';
import { renderMathMarkdown } from '@/lib/math-markdown';
import styles from './graph.module.css';
const colors={c1:'var(--studio-accent)',c2:'var(--color-secondary-400)',c3:'var(--color-warning)'};
export const StudioGraph=memo(function StudioGraph({fns,aria,state,aspect='equal',numberLine=false,items=[],itemParams=state.params}:{fns:GraphStage['fns'];aria:string;state:StageState;aspect?:'equal'|'free';numberLine?:boolean;items?:BoardItem[];itemParams?:Record<string,number>}){
 const ref=useRef<HTMLDivElement>(null),id=useId().replace(/:/g,''),[size,setSize]=useState({width:1200,height:750});
 useEffect(()=>{if(!ref.current||typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(([entry])=>{const width=Math.min(1200,Math.max(200,Math.round(entry.contentRect.width))),height=Math.min(750,Math.max(160,Math.round(entry.contentRect.height)));setSize(old=>old.width===width&&old.height===height?old:{width,height});});observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const svgRef=useRef<SVGSVGElement>(null);
 const itemTargets=useTargetBoxes(ref,svgRef,JSON.stringify([state.camera,itemParams,state.revealed.item,size]));
 const regionMarks=numberLine?state.regions??[]:[];
 const labelReserve=Object.entries(itemTargets).filter(([target])=>target.startsWith('region-label:')).reduce((sum,[,box])=>sum+box.bottom-box.top+5,0);
 const aboveAxis=numberLine&&state.regionMaxLevel?(state.regionMaxLevel*28+40+labelReserve):0;
 const viewport={...size,height:Math.max(size.height,aboveAxis+92),left:30,right:24,top:24,bottom:28};
 const {x,y,sx,sy,unitX,unitY}=equalGraph(state.camera,viewport,aspect,numberLine,aboveAxis),right=size.width-viewport.right,bottom=viewport.height-viewport.bottom;
 const regionGeometries=Object.fromEntries(regionMarks.map(mark=>[mark.id,regionGeometry(mark,sx,sy(0),x)]));
 const regionBoxes=regionTargets(regionMarks,regionGeometries);
 const visiblePoints=state.points.filter(p=>Number.isFinite(p.y)&&p.x>=x[0]&&p.x<=x[1]&&p.y>=y[0]&&p.y<=y[1]);
 const opacity=(target:string)=>(state.highlight?.length&&state.dimOthers&&!state.highlight.includes(target)?0.22:1)*(1-.4*(state.pulses[target]??0));
 const hasX=y[0]<=0&&y[1]>=0,hasY=!numberLine&&x[0]<=0&&x[1]>=0;
 const space:ChalkSpace={x,y,sx,sy,fns,params:state.params,target:target=>{if(target.startsWith('region:'))return regionBoxes[target]??null;const tick=tickValue(target);if(tick!==null)return itemTargets['tick:'+tick]??null;if(target.startsWith('item:'))return itemTargets[target]??null;const point=state.points.find(p=>p.id===target);if(point)return {x:sx(point.x),y:sy(point.y),left:sx(point.x)-8,right:sx(point.x)+8,top:sy(point.y)-8,bottom:sy(point.y)+8};if(target.startsWith('fn:')||target.startsWith('axis:'))return {x:(viewport.left+right)/2,y:(viewport.top+bottom)/2,left:viewport.left,right,top:viewport.top,bottom};return null;}};
 return <div ref={ref} className={styles.container}><svg ref={svgRef} className={styles.graph} viewBox={`0 0 ${viewport.width} ${viewport.height}`} role="img" aria-label={aria} data-number-line={numberLine} data-unit-x={unitX} data-unit-y={unitY}>
  <defs><filter id={id+'glow'} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter><clipPath id={id+'clip'}><rect x={viewport.left} y={viewport.top} width={right-viewport.left} height={bottom-viewport.top}/></clipPath></defs>
  {state.band&&!state.chalk?.some(m=>m.id==='legacy-band')&&<rect className={styles.band} data-target="band" style={{opacity:.24*opacity('band')}} x={viewport.left} y={sy(Math.min(y[1],Math.max(...state.band)))} width={right-viewport.left} height={Math.max(0,sy(Math.max(y[0],Math.min(...state.band)))-sy(Math.min(y[1],Math.max(...state.band))))}/>}
  <g className={styles.axes}>
   {hasX&&<g data-axis="x" opacity={opacity('axis:x')} style={{strokeWidth:numberLine?2:undefined}}><line x1={viewport.left} x2={right} y1={sy(0)} y2={sy(0)}/><polygon points={`${right},${sy(0)} ${right-10},${sy(0)-4} ${right-10},${sy(0)+4}`}/>{numberLine&&<polygon data-arrow="left" points={`${viewport.left},${sy(0)} ${viewport.left+10},${sy(0)-4} ${viewport.left+10},${sy(0)+4}`}/>}<text className={styles.axisName} x={right-6} y={sy(0)-14}>x</text>{spacedTicks(x,unitX).filter(t=>t!==0&&t>x[0]&&t<x[1]).map(t=><foreignObject key={t} x={sx(t)-30} y={sy(0)+8} width={60} height={40}><div className={styles.tickMath}><span data-stage-target={'tick:'+t}><InlineMath math={formatExact(t,"tex")}/></span></div></foreignObject>)}</g>}
   {hasY&&<g data-axis="y" opacity={opacity('axis:y')}><line x1={sx(0)} x2={sx(0)} y1={bottom} y2={viewport.top}/><polygon points={`${sx(0)},${viewport.top} ${sx(0)-4},${viewport.top+10} ${sx(0)+4},${viewport.top+10}`}/><text className={styles.axisName} x={sx(0)+14} y={viewport.top+12}>y</text>{spacedTicks(y,unitY).filter(t=>t!==0&&t>y[0]&&t<y[1]).map(t=><foreignObject key={t} x={sx(0)-64} y={sy(t)-18} width={50} height={40}><div className={styles.tickMath} data-align="end"><span data-stage-target={'ytick:'+t}><InlineMath math={formatExact(t,"tex")}/></span></div></foreignObject>)}</g>}
   {hasX&&(hasY||(numberLine&&x[0]<=0&&x[1]>=0))&&<foreignObject x={sx(0)-58} y={sy(0)+8} width={50} height={40}><div className={styles.tickMath} data-align="end"><span data-stage-target="tick:0"><InlineMath math="0"/></span></div></foreignObject>}
  </g>
  <g clipPath={`url(#${id}clip)`}>{state.visibleFns.map(i=>{const fn=fns[i];if(!fn)return null;const target='fn:'+i,d=curvePath(fn.expr,x,y,state.params,viewport),progress=Math.max(0,Math.min(1,state.drawProgress[target]??1));return <g key={i} opacity={opacity(target)} data-target={target}><path d={d} className={styles.glow} stroke={colors[fn.c]} pathLength={1} strokeDasharray={1} strokeDashoffset={1-progress} filter={`url(#${id}glow)`}/><path d={d} className={styles.curve} stroke={colors[fn.c]} pathLength={1} strokeDasharray={1} strokeDashoffset={1-progress}/></g>;})}</g>
  {visiblePoints.map(p=><g key={p.id} data-target={p.id} opacity={opacity(p.id)}>{p.guides&&<g className={styles.guides}><line x1={sx(p.x)} x2={sx(p.x)} y1={sy(p.y)} y2={sy(0)}/><line x1={sx(p.x)} x2={sx(0)} y1={sy(p.y)} y2={sy(p.y)}/></g>}<line className={styles.point} x1={sx(p.x)} x2={sx(p.x)} y1={sy(p.y)-9} y2={sy(p.y)+9} stroke={colors[p.c??'c1']} style={{filter:'drop-shadow(0 0 4px '+colors[p.c??'c1']+')'}}/></g>)}
  {numberLine&&<RegionLayer state={state} geometries={regionGeometries} boxes={itemTargets} sx={sx} axisY={sy(0)} domain={x}/>}
  <GraphPointLabels regions={Object.values(regionGeometries).flat()} points={visiblePoints} boxes={itemTargets} sx={sx} sy={sy} viewport={labelBox(0,0,size.width,size.height)} numberLine={numberLine} opacity={opacity}/>
  {state.labels.map((label,i)=><foreignObject key={i} x={sx(label.at.x)-(label.anchor==='end'?240:label.anchor==='middle'?120:0)} y={sy(label.at.y)-18} width={240} height={64} overflow="visible"><div className={styles.label} style={{textAlign:label.anchor==='end'?'right':label.anchor==='middle'?'center':'left'}}><span data-stage-target={'annotation:'+i}>{label.tex?renderMathMarkdown('$'+label.tex+'$'):label.text}</span></div></foreignObject>)}
  <BoardItems svg items={items} state={state} params={itemParams} space={{sx,sy}}/>
  <CalloutLayer state={state} space={space} boxes={itemTargets} params={itemParams}/><ChalkLayer marks={state.chalk??[]} space={space}/>
 </svg></div>;
});
