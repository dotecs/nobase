import { z } from 'zod';
import type { EventRow,LessonRow } from './types';
export const lessonEventsSchema=z.array(z.object({type:z.enum(['open','scene','sentence','why_click','quiz','dontknow','gap','complete']),payload:z.record(z.string(),z.unknown()).refine(p=>JSON.stringify(p).length<=8192)})).min(1).max(50);
export function chooseTodayLesson(lessons:LessonRow[],abilityIds:string[]){
 const latest=new Map<string,LessonRow>();for(const l of lessons)if(['reviewed','live'].includes(l.status)&&(!latest.has(l.id)||latest.get(l.id)!.version<l.version))latest.set(l.id,l);
 for(const ability of abilityIds){const lesson=[...latest.values()].filter(l=>l.ability_ids.includes(ability)).sort((a,b)=>Number(a.kind==='worked')-Number(b.kind==='worked')||a.id.localeCompare(b.id))[0];if(lesson)return lesson;}return null;
}
export function summarizeLessonActivity(events:EventRow[]){
 const visits=new Map<string,Map<string,number>>();
 const rows=new Map<string,{id:string;version:number;seconds:number;why:number;gaps:string[];completed:boolean}>();
 for(const event of events){const key=event.lesson_id+':'+event.lesson_version;const row=rows.get(key)??{id:event.lesson_id,version:event.lesson_version,seconds:0,why:0,gaps:[],completed:false};
 const {visit_id,elapsed_ms}=event.payload;const timed=typeof visit_id==='string'&&typeof elapsed_ms==='number'&&Number.isFinite(elapsed_ms)&&elapsed_ms>=0;
 if(timed){const times=visits.get(key)??new Map<string,number>();times.set(visit_id,Math.max(times.get(visit_id)??0,elapsed_ms));visits.set(key,times);}
 if(event.type==='complete'){row.completed=true;const ms=event.payload.duration_ms;if(!timed&&typeof ms==='number'&&Number.isFinite(ms))row.seconds+=Math.max(0,Math.round(ms/1000));}
 if(event.type==='why_click')row.why++;if(event.type==='gap'&&typeof event.payload.concept_id==='string'&&!row.gaps.includes(event.payload.concept_id))row.gaps.push(event.payload.concept_id);rows.set(key,row);}
 for(const [key,times] of visits)rows.get(key)!.seconds+=Math.round([...times.values()].reduce((a,b)=>a+b,0)/1000);
 return [...rows.values()];
}
export function captionDuration(text:string,rate:number){return Math.max(2000,text.length*85)/rate;}
