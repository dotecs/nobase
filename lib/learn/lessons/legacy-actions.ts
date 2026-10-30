import type { Action } from './action-schema';
import type { Lesson,Scene,Sentence } from './schema';
export function sentenceActions(scene:Scene,sentence:Sentence):Action[]{
 const legacy:Action[]=[];
 for(const target of ['step','node','row'] as const){const index=sentence.cue?.[target];if(index!==undefined)for(let i=0;i<=index;i++)legacy.push({type:'reveal',target,index:i});}
 const highlight=sentence.cue?.highlight;
 if(highlight){let targets=[highlight];if(scene.stage.type==='graph'){const matches=scene.stage.fns.flatMap((fn,i)=>fn.c===highlight||fn.label===highlight?['fn:'+i]:[]);if(matches.length)targets=matches;}legacy.push({type:'highlight',target:targets,dim_others:true});}
 const explicit=sentence.cue?.actions??[];
 return [...legacy.filter(a=>!explicit.some(b=>JSON.stringify(a)===JSON.stringify(b))),...explicit];
}
/** Retain legacy cue fields for v1 viewers; do not modify the stored body or TTS text. */
export function normalizeLessonActions(lesson:Lesson):Lesson{return {...lesson,scenes:lesson.scenes.map(scene=>({...scene,narration:scene.narration.map(sentence=>{const actions=sentenceActions(scene,sentence);return actions.length?{...sentence,cue:{...sentence.cue,actions}}:sentence;})}))};}
