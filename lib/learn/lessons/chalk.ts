import type {Action} from './action-schema';
import type {ChalkAction} from './chalk-schema';
import {parseMath} from '../mathcheck/parse';
import {numeric} from '../mathcheck/evaluate';
export type ChalkMark={id:string;action:ChalkAction;progress:number;opacity:number;elapsed:number;yRange?:[number,number]};
export type ChalkPoint={x:number;y:number};
export type TargetBox={left:number;top:number;right:number;bottom:number;x:number;y:number};
export type ChalkSpace={sx:(n:number)=>number;sy:(n:number)=>number;x:[number,number];y:[number,number];target:(id:string)=>TargetBox|null;fns?:{expr:string}[];params?:Record<string,number>};
export function isChalk(action:Action):action is ChalkAction{return ['pointer','circle','underline','arrow','bracket','shade','handwrite','flash'].includes(action.type);}
export function chalkAt(action:ChalkAction,start:number,time:number,id:string):ChalkMark|null{const elapsed=time-start,ttl=action.ttl_ms??2500;if(elapsed<0||(ttl>0&&elapsed>=ttl))return null;return {id,action,elapsed,progress:Math.min(1,elapsed/400),opacity:ttl===0?1:Math.min(1,(ttl-elapsed)/Math.min(300,ttl))};}
export function chalkPoint(value:string|ChalkPoint,space:ChalkSpace):ChalkPoint|null{return typeof value==='string'?space.target(value):{x:space.sx(value.x),y:space.sy(value.y)};}
export function chalkLine(points:ChalkPoint[],wobble=false,close=false){if(!points.length)return '';return points.map((p,i)=>(i?'L':'M')+(p.x+(wobble?Math.sin(i*1.7)*1.3:0)).toFixed(2)+','+(p.y+(wobble?Math.sin(i*2.3)*1.3:0)).toFixed(2)).join(' ')+(close?' Z':'');}
export function linePoints(from:ChalkPoint,to:ChalkPoint){return Array.from({length:13},(_,i)=>({x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12}));}
export function circlePoints(center:ChalkPoint,rx:number,ry:number){return Array.from({length:49},(_,i)=>({x:center.x+Math.cos(i/48*Math.PI*2)*rx,y:center.y+Math.sin(i/48*Math.PI*2)*ry}));}
export function shadePath(mark:ChalkMark,space:ChalkSpace){const a=mark.action;if(a.type!=='shade')return '';const low=Math.max(space.x[0],a.x?.[0]??space.x[0]),high=Math.min(space.x[1],a.x?.[1]??space.x[1]);if(low>=high)return '';const ids=[...a.region.matchAll(/fn:(\d+)/g)].map(m=>Number(m[1])),asts=ids.map(i=>space.fns?.[i]?.expr).map(expr=>expr?parseMath(expr).left:null),clamp=(y:number)=>Math.min(space.y[1],Math.max(space.y[0],y)),value=(i:number,x:number)=>asts[i]?numeric(asts[i]!,{...space.params,x}):0;
 const upper:ChalkPoint[]=[],lower:ChalkPoint[]=[];for(let i=0;i<=80;i++){const x=low+(high-low)*i/80;let aY:number,bY:number;if(mark.yRange){[aY,bY]=mark.yRange;}else if(a.region.startsWith('above:')){aY=value(0,x);bY=space.y[1];}else if(a.region.startsWith('below:')){aY=space.y[0];bY=value(0,x);}else{aY=value(0,x);bY=value(1,x);}if(!Number.isFinite(aY)||!Number.isFinite(bY))continue;upper.push({x:space.sx(x),y:space.sy(clamp(aY))});lower.push({x:space.sx(x),y:space.sy(clamp(bY))});}return chalkLine([...upper,...lower.reverse()],false,true);}
