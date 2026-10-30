import {isChalk} from './chalk';
import {resolveAnchor,type At} from './anchors';
import type { Scene } from './schema';
export function actionErrors(scene:Scene):string[]{
 const {stage}=scene,graph=stage.type==='graph'||stage.type==='slider';
 const counts={fn:stage.type==='graph'?stage.fns.length:stage.type==='slider'?1:0,point:(stage.type==='graph'&&!stage.initial?.hidden_points?stage.points?.length??0:0)+scene.narration.flatMap(n=>n.cue?.actions??[]).filter(a=>a.type==='point').length,step:stage.type==='steps'?stage.steps.length:0,node:stage.type==='chain'?stage.nodes.length:0,row:stage.type==='table'?stage.rows.length:0};
 const valid=(target:string)=>{const cell=target.match(/^cell:(\d+):(\d+)$/);if(cell)return stage.type==='table'&&Number(cell[1])<stage.rows.length&&Number(cell[2])<stage.columns.length;if(target==='axis:x'||target==='axis:y'||target==='band')return graph;const match=target.match(/^(fn|point|step|node|row):(\d+)$/);return !!match&&Number(match[2])<counts[match[1] as keyof typeof counts];};
 const errors:string[]=[];
 if(graph&&stage.initial?.hidden_fns?.some(i=>i>=counts.fn))errors.push('initial.hidden_fns 범위 오류');
 for(const sentence of scene.narration)for(const action of sentence.cue?.actions??[]){
  if(typeof action.at==='string'){const result=resolveAnchor(action.at as At,sentence,null,1000);if(result.warning||result.source==='caption')errors.push(result.warning??'앵커는 TTS 대본에 있어야 합니다: '+action.at);}
  if(isChalk(action)){if('target' in action&&action.target&&!valid(action.target))errors.push('칠판 대상 범위 오류');if(action.type==='arrow'&&[action.from,action.to].some(p=>typeof p==='string'?!valid(p):!graph))errors.push('화살표 대상 또는 좌표 오류');if(['circle','handwrite','bracket','shade'].includes(action.type)&&!graph)errors.push('칠판 좌표는 그래프 무대에서 사용하세요.');if(action.type==='pointer'&&(typeof action.at==='object'||action.position)&&!graph)errors.push('pointer 좌표는 그래프 전용입니다.');if(action.type==='shade'&&[...action.region.matchAll(/fn:(\d+)/g)].some(m=>Number(m[1])>=counts.fn))errors.push('shade 함수 범위 오류');}
  if(action.type==='param'&&(stage.type!=='slider'||action.name!==stage.param.name))errors.push('param.name 불일치');
  if(['draw','point','camera','label','band'].includes(action.type)&&!graph)errors.push('그래프 전용 액션입니다.');
  if(action.type==='draw'&&!valid(action.target))errors.push('draw 대상 범위 오류');
  if(action.type==='point'&&action.on&&!valid(action.on))errors.push('point 함수 범위 오류');
  if(action.type==='reveal'&&!valid(action.target+':'+action.index))errors.push('reveal 대상 범위 오류');
  if(action.type==='highlight'&&[action.target].flat().some(t=>!valid(t)))errors.push('highlight 대상 범위 오류');
  if(action.type==='pulse'&&!valid(action.target))errors.push('pulse 대상 범위 오류');
 }
 return errors;
}

export function actionWarnings(scene:Scene){return scene.narration.flatMap(s=>(s.cue?.actions??[]).filter(a=>a.type==='pointer'||a.type==='circle').length>2?[s.id+': pointer·circle은 한 문장에 2개 이하를 권장합니다.']:[]);}
