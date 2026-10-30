// Test-only adapter. The author's HTML is the fixture, never a production seed.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { lessonSchema } from './schema';
export function prototypeLesson(){
  const html=readFileSync('docs/lesson-prototype-11.html','utf8');
  const object=html.match(/const LESSON = ([\s\S]*?);\s*\/\/ ---------- Standard graph/)?.[1];
  if(!object)throw new Error('LESSON fixture missing');
  const raw=runInNewContext('('+object+')',{}, {timeout:1000});
  return lessonSchema.parse({...raw,kind:'worked',pack_id:'root-math',ability_ids:['11-1'],scenes:raw.scenes.map((scene:any)=>{
    let stage=scene.stage;
    if(stage.type==='graph')stage={...stage,aria:scene.title,fns:stage.fns.map((f:any)=>({expr:f.label.replace(/^y=/,''),c:f.c,label:f.label}))};
    if(stage.type==='steps')stage={...stage,steps:stage.steps.map((s:any)=>({tex:s.tex,why:s.whyText,think:s.think}))};
    if(stage.type==='slider')stage={type:'slider',expr:'x^2+2x+c',param:{name:'c',min:stage.cRange[0],max:stage.cRange[1],step:.1,init:stage.c0},x:[-5,3],y:[-5,7],verdict:'discriminant'};
    if(stage.type==='table')stage={type:'table',columns:['방정식','판별식','실근'],rows:stage.rows.map((r:any)=>({cells:['$'+r.eq+'$','$'+r.d+'$',r.kind],tone:r.sign}))};
    if(stage.type==='quiz')stage={type:'quiz',stem_md:'$'+stage.q+'$',options:stage.options.map((o:any,i:number)=>({id:String.fromCharCode(97+i),text_md:'$'+o.t+'$'})),correct:String.fromCharCode(97+stage.options.findIndex((o:any)=>o.ok)),explain:stage.explain,trace_concept_id:'c.discriminant-meaning'};
    return {...scene,tag:scene.kind,stage,narration:scene.narration.map((n:any,i:number)=>({id:scene.id+'-'+(i+1),...n}))};
  })});
}
