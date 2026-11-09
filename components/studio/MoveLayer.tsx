'use client';
import {useLayoutEffect,useRef,useState,type RefObject} from 'react';
import type {StageState} from '@/lib/learn/lessons/stage-state';
import type {TargetBox} from '@/lib/learn/lessons/chalk';
import {moveGeometry,type MoveMark} from '@/lib/learn/lessons/move';
import {instructionColor} from '@/lib/learn/lessons/instruction-style';
import {annotationColor} from '@/lib/learn/lessons/annotation-schema';
import styles from './move.module.css';
export type MoveSource={html:string;fontFamily:string;fontSize:string;fontWeight:string;fontStyle:string;lineHeight:string;color:string};
type Measurement={from:TargetBox;to:TargetBox;source:MoveSource};
/** Root-local CSS pixels: pointing rectangles without a second SVG scale. */
export function measuredMoveBox(rect:DOMRect,root:DOMRect,width:number,height:number):TargetBox{
 const sx=root.width/width||1,sy=root.height/height||1,left=(rect.left-root.left)/sx,top=(rect.top-root.top)/sy,right=(rect.right-root.left)/sx,bottom=(rect.bottom-root.top)/sy;
 return {left,top,right,bottom,x:(left+right)/2,y:(top+bottom)/2};
}
export function MoveCopy({move,measurement,reduced=false}:{move:MoveMark;measurement:Measurement;reduced?:boolean}){
 const inner=useRef<HTMLSpanElement>(null),[natural,setNatural]=useState({width:0,height:0,left:0,top:0});
 const {source,from,to}=measurement;
 useLayoutEffect(()=>{const element=inner.current;if(!element)return;const measure=()=>{const width=element.offsetWidth,height=element.offsetHeight,left=element.offsetLeft,top=element.offsetTop;setNatural(old=>old.width===width&&old.height===height&&old.left===left&&old.top===top?old:{width,height,left,top});};const observer=new ResizeObserver(measure);observer.observe(element);measure();return()=>observer.disconnect();},[source.html,source.fontSize,reduced,move.flying]);
 if(!move.flying||reduced)return null;
 const box=moveGeometry(from,to,move.progress);
 return <div data-move-clone={move.id} aria-hidden="true" className={styles.copy} style={{visibility:natural.width?'visible':'hidden',transform:`translate(${box.left-natural.left*box.width/(natural.width||1)}px,${box.top-natural.top*box.height/(natural.height||1)}px) scale(${box.width/(natural.width||1)},${box.height/(natural.height||1)})`,color:annotationColor(move.color)??source.color}}>
  <span ref={inner} className="katex" style={{display:'inline',whiteSpace:'nowrap',fontFamily:source.fontFamily,fontSize:source.fontSize,fontWeight:source.fontWeight,fontStyle:source.fontStyle,lineHeight:source.lineHeight}} dangerouslySetInnerHTML={{__html:source.html}}/>
 </div>;
}
export function MoveLayer({root,state}:{root:RefObject<HTMLElement>;state:StageState}){
 const [measurements,setMeasurements]=useState<Record<string,Measurement>>({});
 const [reduced,setReduced]=useState(false);
 const moves=state.moves??[];
 const revision=JSON.stringify(moves.map(m=>[m.id,m.from,m.to,m.arrived,m.keepColor,m.flying]));
 useLayoutEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)'),update=()=>setReduced(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 useLayoutEffect(()=>{
  const element=root.current;if(!element||!moves.length)return;
  const measure=()=>{
   const rect=element.getBoundingClientRect(),targets=new Map<string,HTMLElement>();
   element.querySelectorAll<HTMLElement>('[data-stage-target]').forEach(target=>{if(!target.closest('[data-move-clone]'))targets.set(target.dataset.stageTarget!,target);});
   const next:Record<string,Measurement>={};
   for(const move of moves){const from=targets.get(move.from),to=targets.get(move.to);if(!from||!to)continue;
    const computed=getComputedStyle(from);
    next[move.id]={from:measuredMoveBox(from.getBoundingClientRect(),rect,element.offsetWidth,element.offsetHeight),to:measuredMoveBox(to.getBoundingClientRect(),rect,element.offsetWidth,element.offsetHeight),source:{html:from.innerHTML,fontFamily:computed.fontFamily,fontSize:computed.fontSize,fontWeight:computed.fontWeight,fontStyle:computed.fontStyle,lineHeight:computed.lineHeight,color:computed.color}};
    if(!move.color){if(move.keepColor){if(to.style.color!==computed.color)to.style.color=computed.color;to.dataset.moveColor='true';}else if(to.dataset.moveColor){to.style.color=instructionColor(state,move.to)??'';delete to.dataset.moveColor;}}
   }
   setMeasurements(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  };
  let frame=0;const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;measure();});};
  const resize=new ResizeObserver(schedule);resize.observe(element);
  element.querySelectorAll('[data-stage-target]').forEach(target=>{if(!target.closest('[data-move-clone]'))resize.observe(target);});
  const mutations=new MutationObserver(records=>{if(records.some(record=>!(record.target instanceof Element&&record.target.closest('[data-move-layer]'))))schedule();});
  mutations.observe(element,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','transform'],characterData:true});
  window.addEventListener('resize',schedule);document.fonts?.ready.then(schedule);measure();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();mutations.disconnect();window.removeEventListener('resize',schedule);};
 // Measure identity/layout changes, not progress frames.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[root,revision]);
 return <div className={styles.layer} data-move-layer="true" aria-hidden="true">{!state.suppressMoves&&moves.filter(m=>m.flying&&measurements[m.id]).map(move=><MoveCopy key={move.id} move={move} measurement={measurements[move.id]} reduced={reduced}/>)}</div>;
}
