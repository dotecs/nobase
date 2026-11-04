import type {Action} from './action-schema';
import type {ChalkAction} from './chalk-schema';
import {parseMath} from '../mathcheck/parse';
import {numeric} from '../mathcheck/evaluate';
export type ChalkMark={id:string;action:ChalkAction;progress:number;opacity:number;elapsed:number;yRange?:[number,number]};
export type ChalkPoint={x:number;y:number};
export type TargetBox={left:number;top:number;right:number;bottom:number;x:number;y:number};
export type ChalkSpace={sx:(n:number)=>number;sy:(n:number)=>number;x:[number,number];y:[number,number];target:(id:string)=>TargetBox|null;fns?:{expr:string}[];params?:Record<string,number>};
export function isChalk(action:Action):action is ChalkAction{return ['pointer','circle','underline','arrow','bracket','shade','handwrite','flash'].includes(action.type);}
export function chalkAt(action:ChalkAction,start:number,time:number,id:string):ChalkMark|null{const elapsed=time-start,ttl=action.ttl_ms??(action.type==='handwrite'?0:2500);if(elapsed<0||(ttl>0&&elapsed>=ttl))return null;return {id,action,elapsed,progress:Math.min(1,elapsed/400),opacity:ttl===0?1:Math.min(1,(ttl-elapsed)/Math.min(200,ttl))};}
export function chalkPoint(value:string|ChalkPoint,space:ChalkSpace):ChalkPoint|null{return typeof value==='string'?space.target(value):{x:space.sx(value.x),y:space.sy(value.y)};}
/** Point on the edge of a target's box (6px outside) so arrows stop at the glyph instead of piercing it. */
export function targetAnchor(target:string,anchor:'center'|'top'|'bottom'|'left'|'right'|undefined,space:ChalkSpace):ChalkPoint|null{const box=space.target(target);if(!box)return null;const gap=6;switch(anchor){case 'top':return {x:box.x,y:box.top-gap};case 'bottom':return {x:box.x,y:box.bottom+gap};case 'left':return {x:box.left-gap,y:box.y};case 'right':return {x:box.right+gap,y:box.y};default:return {x:box.x,y:box.y};}}
/** 2026-11-02 대표 결정: 분필 선은 흔들림 없이 곧게 그린다. wobble 인자는 호환용으로만 남긴다. */
export function chalkLine(points:ChalkPoint[],_wobble=false,close=false){void _wobble;if(!points.length)return '';return points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ')+(close?' Z':'');}
export function linePoints(from:ChalkPoint,to:ChalkPoint){return Array.from({length:13},(_,i)=>({x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12}));}
export function circlePoints(center:ChalkPoint,rx:number,ry:number){return Array.from({length:49},(_,i)=>({x:center.x+Math.cos(i/48*Math.PI*2)*rx,y:center.y+Math.sin(i/48*Math.PI*2)*ry}));}
export function bracketPoints(from:ChalkPoint,to:ChalkPoint,normal:ChalkPoint){const length=Math.hypot(to.x-from.x,to.y-from.y),depth=Math.min(10,length/8),points:ChalkPoint[]=[];const add=(u:number,v:number)=>points.push({x:from.x+(to.x-from.x)*u/length+normal.x*v,y:from.y+(to.y-from.y)*u/length+normal.y*v});if(!length)return [];add(0,0);add(0,depth);add(length,depth);add(length,0);return points;}
export function shadePath(mark:ChalkMark,space:ChalkSpace){const a=mark.action;if(a.type!=='shade')return '';const low=Math.max(space.x[0],a.x?.[0]??space.x[0]),high=Math.min(space.x[1],a.x?.[1]??space.x[1]);if(low>=high)return '';const ids=[...a.region.matchAll(/fn:(\d+)/g)].map(m=>Number(m[1])),asts=ids.map(i=>space.fns?.[i]?.expr).map(expr=>expr?parseMath(expr).left:null),clamp=(y:number)=>Math.min(space.y[1],Math.max(space.y[0],y)),value=(i:number,x:number)=>asts[i]?numeric(asts[i]!,{...space.params,x}):0;
 const upper:ChalkPoint[]=[],lower:ChalkPoint[]=[];for(let i=0;i<=80;i++){const x=low+(high-low)*i/80;let aY:number,bY:number;if(mark.yRange){[aY,bY]=mark.yRange;}else if(a.region.startsWith('above:')){aY=value(0,x);bY=space.y[1];}else if(a.region.startsWith('below:')){aY=space.y[0];bY=value(0,x);}else{aY=value(0,x);bY=value(1,x);}if(!Number.isFinite(aY)||!Number.isFinite(bY))continue;upper.push({x:space.sx(x),y:space.sy(clamp(aY))});lower.push({x:space.sx(x),y:space.sy(clamp(bY))});}return chalkLine([...upper,...lower.reverse()],false,true);}

export function underlinePoints(action:Extract<ChalkAction,{type:'underline'}>,space:ChalkSpace){if(action.from&&action.to)return linePoints(chalkPoint(action.from,space)!,chalkPoint(action.to,space)!);if(action.target==='axis:x')return linePoints({x:space.sx(space.x[0]),y:space.sy(0)},{x:space.sx(space.x[1]),y:space.sy(0)});if(action.target==='axis:y')return linePoints({x:space.sx(0),y:space.sy(space.y[0])},{x:space.sx(0),y:space.sy(space.y[1])});const b=space.target(action.target);return b?linePoints({x:b.left,y:b.bottom+3},{x:b.right,y:b.bottom+3}):[];}
export function curvedArrow(from:ChalkPoint,to:ChalkPoint){const dx=to.x-from.x,dy=to.y-from.y,c={x:(from.x+to.x)/2-dy*.15,y:(from.y+to.y)/2+dx*.15};return Array.from({length:25},(_,i)=>{const t=i/24;return {x:(1-t)**2*from.x+2*(1-t)*t*c.x+t*t*to.x,y:(1-t)**2*from.y+2*(1-t)*t*c.y+t*t*to.y};});}

export function rotatedMemoBounds(rect: { left: number; top: number; width: number; height: number }, anchor: ChalkPoint, degrees: number): TargetBox {
  const radians = degrees * Math.PI / 180;
  const corners = [
    { x: rect.left, y: rect.top }, { x: rect.left + rect.width, y: rect.top },
    { x: rect.left, y: rect.top + rect.height }, { x: rect.left + rect.width, y: rect.top + rect.height },
  ].map(point => ({
    x: anchor.x + (point.x - anchor.x) * Math.cos(radians) - (point.y - anchor.y) * Math.sin(radians),
    y: anchor.y + (point.x - anchor.x) * Math.sin(radians) + (point.y - anchor.y) * Math.cos(radians),
  }));
  const left = Math.min(...corners.map(point => point.x)), right = Math.max(...corners.map(point => point.x));
  const top = Math.min(...corners.map(point => point.y)), bottom = Math.max(...corners.map(point => point.y));
  return { left, right, top, bottom, x: (left + right) / 2, y: (top + bottom) / 2 };
}

/** Start just outside the measured text, on the side facing the destination. */
export function memoArrowStart(box: TargetBox, target: ChalkPoint): ChalkPoint {
  const dx = target.x - box.x, dy = target.y - box.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return { x: box.right + 8, y: box.y };
  const edge = Math.min(dx ? (box.right - box.left) / 2 / Math.abs(dx) : Infinity, dy ? (box.bottom - box.top) / 2 / Math.abs(dy) : Infinity);
  return { x: box.x + dx * edge + dx / distance * 8, y: box.y + dy * edge + dy / distance * 8 };
}
