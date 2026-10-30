import {resolveAnchor,type At} from './anchors';
import type {Alignment} from './alignment';
import {captionDuration} from './events';
import type { Scene } from './schema';
import type { StageState,StagePoint } from './stage-state';
import { sentenceActions } from './legacy-actions';
import { parseMath } from '../mathcheck/parse';
import { numeric } from '../mathcheck/evaluate';
type Track={from:number;to:number;start:number;duration:number;easing?:'linear'|'ease'|'ease-in-out';set:(value:number)=>void};
function ease(p:number,kind:Track['easing']){if(!kind||kind==='linear'||p===0||p===1)return p;const [x1,y1,x2,y2]=kind==='ease'?[.25,.1,.25,1]:[.42,0,.58,1];const cubic=(t:number,a:number,b:number)=>3*(1-t)**2*t*a+3*(1-t)*t*t*b+t**3;let low=0,high=1;for(let i=0;i<20;i++){const t=(low+high)/2;if(cubic(t,x1,x2)<p)low=t;else high=t;}return cubic((low+high)/2,y1,y2);}
/** Rebuild from the scene origin, never from a previous render or a wall clock. */
export function stageStateAt(scene:Scene,tMs:number,sentenceStarts:number[],options:{alignments?:Record<string,Alignment|null>;durations?:Record<string,number|null>}={}):StageState{
 if(sentenceStarts.length!==scene.narration.length||sentenceStarts.some((value,i)=>!Number.isFinite(value)||value<0||(i>0&&value<sentenceStarts[i-1])))throw new Error('Invalid sentence timeline');
 const stage=scene.stage,isGraph=stage.type==='graph'||stage.type==='slider',fns=stage.type==='graph'?stage.fns:stage.type==='slider'?[{expr:stage.expr}]:[];
 const state:StageState={params:stage.type==='slider'?{[stage.param.name]:stage.param.init}:{},drawProgress:{},visibleFns:fns.flatMap((_,i)=>isGraph&&stage.initial?.hidden_fns?.includes(i)?[]:[i]),points:[],highlight:null,dimOthers:true,camera:isGraph?{x:[...stage.x],y:[...stage.y]}:{x:[-4,4],y:[-3,7]},labels:[],band:stage.type==='graph'&&stage.band?[...stage.band]:null,revealed:{step:[],node:[],row:[]},pulses:{},warnings:[]};
 let points:Array<Omit<StagePoint,'y'>&{y?:number;on?:string}>=stage.type==='graph'&&!stage.initial?.hidden_points?(stage.points??[]).map((p,i)=>({...p,id:'point:'+i})):[];
 let pointIndex=points.length;
 const tracks=new Map<string,Track>(),pulses=new Map<string,number>();
 const advance=(time:number)=>{for(const track of tracks.values()){const p=track.duration===0?1:Math.max(0,Math.min(1,(time-track.start)/track.duration));track.set(track.from+(track.to-track.from)*ease(p,track.easing));}};
 const events=scene.narration.flatMap((sentence,i)=>sentenceActions(scene,sentence).map(action=>{const duration=options.durations?.[sentence.id]??(sentenceStarts[i+1]!==undefined?sentenceStarts[i+1]-sentenceStarts[i]:captionDuration(sentence.text,1)),at=(typeof action.at==='object'?action.at_ms:action.at??action.at_ms)??0,resolved=resolveAnchor(at as At,sentence,options.alignments?.[sentence.id]??null,duration);if(resolved.warning)state.warnings!.push(resolved.warning);return {action,start:sentenceStarts[i]+resolved.ms};})).sort((a,b)=>a.start-b.start);
 const time=Math.max(0,Number.isFinite(tMs)?tMs:0);
 for(const {action,start} of events){if(start>time)break;advance(start);
  switch(action.type){
   case 'param':{const name=action.name;tracks.set('param:'+name,{from:action.from??state.params[name]??0,to:action.to,start,duration:action.duration_ms??800,easing:action.easing,set:value=>{state.params[name]=value;}});break;}
   case 'draw':{const index=Number(action.target.slice(3));if(!state.visibleFns.includes(index))state.visibleFns.push(index);tracks.set(action.target,{from:0,to:1,start,duration:action.duration_ms??800,set:value=>{state.drawProgress[action.target]=value;}});break;}
   case 'point':points.push({id:'point:'+pointIndex++,x:action.x,y:action.y,on:action.on,c:action.c,label:action.label});break;
   case 'highlight':state.highlight=[action.target].flat();state.dimOthers=action.dim_others??true;break;
   case 'reveal':state.revealed[action.target]=[...state.revealed[action.target].filter(i=>i!==action.index),action.index];break;
   case 'camera':{const width=action.width??(state.camera.x[1]-state.camera.x[0]),height=width*(state.camera.y[1]-state.camera.y[0])/(state.camera.x[1]-state.camera.x[0]),target={x:action.x??[action.cx!-width/2,action.cx!+width/2],y:action.y??[action.cy!-height/2,action.cy!+height/2]};for(const axis of ['x','y'] as const)for(const index of [0,1] as const)tracks.set('camera:'+axis+index,{from:state.camera[axis][index],to:target[axis][index],start,duration:action.duration_ms??800,set:value=>{state.camera[axis][index]=value;}});break;}
   case 'label':state.labels.push({text:action.text,tex:action.tex,at:{...action.at},anchor:action.anchor});break;
   case 'band':state.band=action.y?[...action.y]:null;break;
   case 'pulse':pulses.set(action.target,start);break;
   case 'clear':if(!action.what||action.what==='all')state.band=null;if(!action.what||action.what==='all'||action.what==='labels')state.labels=[];if(!action.what||action.what==='all'||action.what==='points')points=[];if(!action.what||action.what==='all'||action.what==='highlight'){state.highlight=null;pulses.clear();}break;
  }
 }
 advance(time);
 state.points=points.map(point=>{const fn=point.on?fns[Number(point.on.slice(3))]:undefined;return {...point,on:point.y===undefined?point.on:undefined,y:point.y??(fn?numeric(parseMath(fn.expr).left,{...state.params,x:point.x}):NaN)};});
 for(const [target,start] of pulses){const progress=(time-start)/800;if(progress>=0&&progress<1)state.pulses[target]=Math.sin(Math.PI*progress);}
 return state;
}
