'use client';
import {MoveLayer} from './MoveLayer';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {Scene} from '@/lib/learn/lessons/schema';
import type {StageState} from '@/lib/learn/lessons/stage-state';
import {itemsOf} from '@/lib/learn/lessons/items';
import {paperStage} from '@/lib/learn/lessons/stage-targets';
import {portraitLayout,type PortraitNote} from '@/lib/learn/lessons/portrait-layout';
import {calloutTarget} from '@/lib/learn/lessons/callout';
import {BoardItems} from './BoardItems';
import {ChalkLayer} from './ChalkLayer';
import {CalloutLayer} from './CalloutLayer';
import {useTargetBoxes} from './useTargetBoxes';
import styles from './portrait.module.css';

export function PortraitSurface({scene,state,children}:{scene:Scene;state:StageState;children:ReactNode}) {
  const root=useRef<HTMLDivElement>(null),svg=useRef<SVGSVGElement>(null),base=useRef<HTMLDivElement>(null);
  const [size,setSize]=useState({width:360,base:0});
  useEffect(()=>{const measure=()=>{if(!root.current)return;const next={width:root.current.clientWidth,base:base.current?.offsetHeight??0};setSize(old=>old.width===next.width&&old.base===next.base?old:next);};const observer=new ResizeObserver(measure);if(root.current)observer.observe(root.current);if(base.current)observer.observe(base.current);measure();return()=>observer.disconnect();},[]);
  const boxes=useTargetBoxes(root,svg,scene.id+JSON.stringify([state.revealed,size]));
  const figure=scene.stage.type==='figure',graph=scene.stage.type==='graph'||scene.stage.type==='slider';
  const items=figure?[]:itemsOf(scene.stage).filter(item=>state.revealed.item?.includes(item.id)??true);
  const notes:PortraitNote[]=[];
  for(const note of state.callouts??[]){const a=note.action,id=calloutTarget(note.id,a),box=boxes[id],near='near' in a.position?a.position:undefined;
    notes.push({id,target:near?.near??a.target,side:near?.side??(a.anchor==='top'?'above':'below'),gap:near?.gap??a.drop??16,width:box?box.right-box.left:Math.min(220,size.width-24),height:box?box.bottom-box.top:40});}
  for(const mark of state.chalk??[]){const a=mark.action;if(a.type!=='handwrite')continue;const id='memo:'+mark.id,box=boxes[id],near=a.position&&'near' in a.position?a.position:undefined,target=a.arrow_to&&'target' in a.arrow_to?a.arrow_to:undefined;
    notes.push({id,target:near?.near??target?.target,side:near?.side??(target?.anchor==='top'?'above':target?.anchor==='left'?'left':target?.anchor==='right'?'right':'below'),gap:near?.gap??12,width:box?box.right-box.left:Math.min(260,size.width-24),height:box?box.bottom-box.top:40});}
  const layout=portraitLayout(size.width,size.base,items,boxes,notes);
  const latest=state.revealed.step.at(-1)!==undefined?'step:'+state.revealed.step.at(-1):state.revealed.row.at(-1)!==undefined?'row:'+state.revealed.row.at(-1):null;
  useEffect(()=>{
    if(!latest)return;
    const frame=requestAnimationFrame(()=>{
      const scroller=root.current?.closest<HTMLElement>('[data-layout="portrait"][class*="stage_"]')??root.current?.parentElement;
      const target=[...(root.current?.querySelectorAll<HTMLElement>('[data-stage-target]')??[])].find(el=>el.dataset.stageTarget===latest);
      if(!target||!scroller)return;
      const box=target.getBoundingClientRect(),view=scroller.getBoundingClientRect();
      if(box.bottom>view.bottom-12)scroller.scrollTop+=box.bottom-view.bottom+12;
    });
    return()=>cancelAnimationFrame(frame);
  },[latest,layout.height]);
  const coordinates={sx:(x:number)=>x*size.width,sy:(y:number)=>y*size.base};
  const space={...coordinates,x:[0,1] as [number,number],y:[0,1] as [number,number],portrait:true,noteBoxes:layout.notes,target:(id:string)=>boxes[id]??null};
  // 시험지 지면: 위에 붙어 있는 문제 밑으로 스크롤되어 들어간 줄의 지시는 그리지 않는다(문제 위에 겹쳐 보인다).
  const cover=paperStage(scene.stage)?boxes['problem']?.bottom:undefined,covered=(id?:string)=>cover!==undefined&&!!id&&!id.startsWith('problem')&&!!boxes[id]&&boxes[id].top<cover+8;
  const marks=(graph?(state.chalk??[]).filter(mark=>mark.action.type==='handwrite'||('target' in mark.action&&mark.action.target?.startsWith('item:'))):(state.chalk??[])).filter(mark=>!('target' in mark.action&&typeof mark.action.target==='string'&&covered(mark.action.target)));
  return <div ref={root} className={styles.surface} data-layout="portrait" data-paper={paperStage(scene.stage)||undefined} style={{height:layout.height}}>
    {scene.stage.type!=='board'&&<div ref={base} className={styles.base}>{children}</div>}
    <BoardItems items={items} state={state} params={state.params} space={space} layout={layout.items}/>
    <svg ref={svg} className={styles.overlay} viewBox={`0 0 ${size.width} ${layout.height}`}>
      <CalloutLayer state={state} space={space} boxes={boxes}/>
      <ChalkLayer marks={marks} space={space}/>
    </svg>
    <MoveLayer root={root} state={state}/>
  </div>;
}
