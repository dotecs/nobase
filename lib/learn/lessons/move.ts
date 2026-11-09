import {z} from 'zod';
import {tintColors,type TintColor} from './annotation-schema';
import type {Action} from './action-schema';
import type {TargetBox} from './chalk';
const target=z.string().min(1).max(160),time=z.number().finite().nonnegative();
export const moveSchema=z.object({type:z.literal('move'),from:target.optional(),to:target.optional(),pairs:z.array(z.tuple([target,target])).min(1).optional(),stagger_ms:time.optional(),duration_ms:z.number().finite().min(200).max(2000).optional(),color:tintColors.optional(),keep_color:z.enum(['sentence','scene']).optional(),at:z.union([time,z.string().regex(/^@.+$/)]).optional(),at_ms:time.optional()})
 .refine(a=>a.pairs!==undefined?a.from===undefined&&a.to===undefined:a.from!==undefined&&a.to!==undefined,'move에는 from/to 또는 pairs 중 하나가 필요합니다.')
 .refine(a=>(a.pairs??(a.to?[[a.from,a.to]]:[])).every(pair=>pair[1]?.includes('/')),'move 도착은 부분 대상이어야 합니다.');
export type MoveAction=z.infer<typeof moveSchema>;
export type MoveMark={id:string;from:string;to:string;progress:number;flying:boolean;arrived:boolean;color?:TintColor;keepColor:boolean;arrivalElapsed:number};
export const movePairs=(action:MoveAction):[string,string][]=>action.pairs??[[action.from!,action.to!]];
/** Rebuild every destination, including future actions; clear removes only copies whose flights already started. */
export function movesAt(events:{action:Action;start:number;end:number}[],time:number):MoveMark[]{
 const clears=events.filter(e=>e.action.type==='clear'&&(!e.action.what||e.action.what==='all')).map(e=>e.start);
 return events.flatMap((event,eventIndex)=>event.action.type==='move'?movePairs(event.action).map(([from,to],i)=>{
  const action=event.action as MoveAction,start=event.start+i*(action.stagger_ms??180),duration=action.duration_ms??700,end=start+duration;
  const canceled=clears.some(t=>t>=start&&t<end&&t<=time);
  const progress=Math.max(0,Math.min(1,(time-start)/duration)),arrived=progress===1;
  return {id:'move:'+eventIndex+':'+i,from,to,progress,arrived,flying:progress>0&&progress<1&&!canceled,color:action.color,keepColor:arrived&&(action.keep_color==='scene'||time<event.end),arrivalElapsed:Math.max(0,time-end)};
 }):[]);
}
/** Shallow upward arc; position eases, dimensions interpolate linearly. */
export function moveGeometry(from:TargetBox,to:TargetBox,progress:number){
 const p=Math.max(0,Math.min(1,progress)),e=p*p*(3-2*p),height=Math.hypot(to.x-from.x,to.y-from.y)*.15;
 const width=(from.right-from.left)*(1-p)+(to.right-to.left)*p,h=(from.bottom-from.top)*(1-p)+(to.bottom-to.top)*p;
 return {left:from.x+(to.x-from.x)*e-width/2,top:from.y+(to.y-from.y)*e-4*height*e*(1-e)-h/2,width,height:h};
}
