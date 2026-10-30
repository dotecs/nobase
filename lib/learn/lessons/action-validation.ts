import type { Scene } from './schema';
export function actionErrors(scene:Scene):string[]{
 const {stage}=scene,graph=stage.type==='graph'||stage.type==='slider';
 const counts={fn:stage.type==='graph'?stage.fns.length:stage.type==='slider'?1:0,point:(stage.type==='graph'&&!stage.initial?.hidden_points?stage.points?.length??0:0)+scene.narration.flatMap(n=>n.cue?.actions??[]).filter(a=>a.type==='point').length,step:stage.type==='steps'?stage.steps.length:0,node:stage.type==='chain'?stage.nodes.length:0,row:stage.type==='table'?stage.rows.length:0};
 const valid=(target:string)=>{if(target==='axis:x'||target==='axis:y'||target==='band')return graph;const match=target.match(/^(fn|point|step|node|row):(\d+)$/);return !!match&&Number(match[2])<counts[match[1] as keyof typeof counts];};
 const errors:string[]=[];
 if(graph&&stage.initial?.hidden_fns?.some(i=>i>=counts.fn))errors.push('initial.hidden_fns 범위 오류');
 for(const sentence of scene.narration)for(const action of sentence.cue?.actions??[]){
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
