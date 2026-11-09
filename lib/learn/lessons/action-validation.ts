import {movePairs} from './move';
import {sentenceInstruction} from './action-lifetime';
import {regionLevelWarnings} from './region-validation';
import {tickValue} from './pointing';
import {itemsOf} from './items';
import {stageTargetIds,stageMathTargets,partTargetIds,duplicateParts} from './stage-targets';
import {treeNodes} from './tree';
import {isChalk} from './chalk';
import {resolveAnchor,type At} from './anchors';
import type { Scene } from './schema';
export function actionErrors(scene:Scene):string[]{
 const {stage}=scene,graph=stage.type==='graph'||stage.type==='slider';
 const counts={fn:stage.type==='graph'?stage.fns.length:stage.type==='slider'?1:0,point:((stage.type==='graph'||stage.type==='slider')&&!stage.initial?.hidden_points?stage.points?.length??0:0)+scene.narration.flatMap(n=>n.cue?.actions??[]).filter(a=>a.type==='point').length,step:stage.type==='steps'?stage.steps.length:0,node:stage.type==='chain'?stage.nodes.length:0,row:stage.type==='table'?stage.rows.length:0};
 const treeIds=new Set(stage.type==='tree'?treeNodes(stage.root).map(n=>n.node.id):[]);
 const ratioChalk=!graph&&(stage.type==='board'||stage.type==='figure'||itemsOf(stage).length>0);
 const callouts=scene.narration.flatMap(sentence=>sentence.cue?.actions??[]).filter(action=>action.type==='callout');
 const regions=scene.narration.flatMap(sentence=>sentence.cue?.actions??[]).filter(action=>action.type==='region');
 const regionIds=new Map(regions.filter(region=>region.id).map(region=>[region.id!,region]));
 const itemIds=stageTargetIds(stage);
 const valid=(target:string)=>{if(itemIds.has(target))return true;if(target.startsWith('region:')){const match=target.match(/^region:([a-z][a-z0-9-]*)(?:\/(\d+))?$/),region=match&&regionIds.get(match[1]);return !!region&&(match![2]===undefined||Number(match![2])<region.ranges.length);}if(target.startsWith('tick:'))return graph&&tickValue(target)!==null;if(target.startsWith('item:'))return itemIds.has(target);if(target.startsWith('tree:'))return treeIds.has(target.slice(5));const cell=target.match(/^cell:(\d+):(\d+)$/);if(cell)return stage.type==='table'&&Number(cell[1])<stage.rows.length&&Number(cell[2])<stage.columns.length;if(target==='axis:x'||target==='axis:y'||target==='band')return graph;const match=target.match(/^(fn|point|step|node|row):(\d+)$/);return !!match&&Number(match[2])<counts[match[1] as keyof typeof counts];};
 const errors:string[]=stageMathTargets(stage).flatMap(({target,tex})=>duplicateParts(target,tex));
 if(regionIds.size!==regions.filter(region=>region.id).length)errors.push('region ID 중복');
 for(const region of regions){
  if(!graph||!stage.number_line)errors.push('region은 number_line 수직선 무대 전용입니다.');
  if(region.intersect_with&&(!regionIds.has(region.intersect_with)||region.intersect_with===region.id))errors.push('region intersect_with 참조 오류');
 }

 for(const callout of callouts)if(callout.id){
  if(itemIds.has('item:'+callout.id))errors.push('callout ID 중복: '+callout.id);
  itemIds.add('item:'+callout.id);
  for(const part of partTargetIds('item:'+callout.id,callout.tex??''))itemIds.add(part);
  errors.push(...duplicateParts('item:'+callout.id,callout.tex??''));
 }

 for(const item of itemsOf(stage))if(item.position&&'near' in item.position&&(!valid(item.position.near)||item.position.near==='item:'+item.id))errors.push('item near 대상 오류');
 if(graph&&stage.initial?.hidden_fns?.some(i=>i>=counts.fn))errors.push('initial.hidden_fns 범위 오류');
 const moveDestinations=new Set<string>();
 for(const sentence of scene.narration)for(const action of sentence.cue?.actions??[]){
  if('position' in action&&action.position&&'near' in action.position&&!valid(action.position.near))errors.push('near 대상 범위 오류');
  if(typeof action.at==='string'){const result=resolveAnchor(action.at as At,sentence,null,1000);if(result.warning||result.source==='caption')errors.push(result.warning??'앵커는 TTS 대본에 있어야 합니다: '+action.at);}
  if(action.type==='move')for(const [from,to] of movePairs(action)){
   if(!valid(from)||!valid(to))errors.push('move 대상 범위 오류');
   if(!to.includes('/')||!itemIds.has(to))errors.push('move 도착은 부분 대상이어야 합니다.');
   if(moveDestinations.has(to))errors.push('move 도착 대상 중복: '+to);
   moveDestinations.add(to);
  }
  if(action.type==='tint'&&(!/^(item|step|node|row|cell|tree|region):/.test(action.target)||!valid(action.target)))errors.push('tint 대상 범위 오류');
  if(action.type==='callout'){
   if(action.target&&(!valid(action.target)||action.target==='item:'+action.id))errors.push('callout 대상 범위 오류');
   if(!graph&&[...('x' in action.position?[action.position]:[]),...(action.from?[action.from]:[])].some(p=>p.x<0||p.x>1||p.y<0||p.y>1))errors.push('callout 비율 좌표는 0~1이어야 합니다.');
   for(const match of (action.tex??action.text??'').matchAll(/\{\{([^}]+)\}\}/g))if(stage.type!=='slider'||match[1]!==stage.param.name)errors.push('없는 callout 파라미터: '+match[1]);
  }
  if(action.type==='strike'&&(action.pairs?.flat()??action.targets??[action.target!]).some(target=>!valid(target)))errors.push('strike 대상 범위 오류');
  if(isChalk(action)){if(action.type==='handwrite'&&action.arrow_to&&'target' in action.arrow_to&&!valid(action.arrow_to.target))errors.push('메모 화살표 대상 오류');if('target' in action&&action.target&&!valid(action.target))errors.push('칠판 대상 범위 오류');if(action.type==='arrow'&&[action.from,action.to].some(p=>typeof p==='string'?!valid(p):!(graph||ratioChalk)))errors.push('화살표 대상 또는 좌표 오류');if(['bracket','shade'].includes(action.type)&&!graph)errors.push('칠판 좌표는 그래프 무대에서 사용하세요.');if((action.type==='handwrite'||(action.type==='circle'&&!action.target))&&!(graph||ratioChalk))errors.push('칠판 좌표는 그래프 또는 board에서 사용하세요.');if(action.type==='pointer'&&(typeof action.at==='object'||action.position)&&!(graph||ratioChalk))errors.push('pointer 좌표는 그래프 전용입니다.');if(action.type==='shade'&&[...action.region.matchAll(/fn:(\d+)/g)].some(m=>Number(m[1])>=counts.fn))errors.push('shade 함수 범위 오류');}
  if(ratioChalk&&isChalk(action)) {
   const coordinates:{x:number;y:number}[]=[];
   if(action.position&&'x' in action.position)coordinates.push(action.position);
   if(typeof action.at==='object')coordinates.push(action.at);
   if(action.type==='arrow'){if(typeof action.from!=='string')coordinates.push(action.from);if(typeof action.to!=='string')coordinates.push(action.to);}
   if(action.type==='underline'){if(action.from)coordinates.push(action.from);if(action.to)coordinates.push(action.to);}
   if(action.type==='handwrite'&&action.arrow_to&&'x' in action.arrow_to)coordinates.push(action.arrow_to);
   if(coordinates.some(p=>p.x<0||p.x>1||p.y<0||p.y>1))errors.push('board 지시 좌표는 0~1이어야 합니다.');
  }
  if(action.type==='param'&&(stage.type!=='slider'||action.name!==stage.param.name))errors.push('param.name 불일치');
  if(['draw','point','camera','label','band'].includes(action.type)&&!graph)errors.push('그래프 전용 액션입니다.');
  if(action.type==='draw'&&!valid(action.target))errors.push('draw 대상 범위 오류');
  if(action.type==='point'&&action.on&&!valid(action.on))errors.push('point 함수 범위 오류');
  if(action.type==='reveal'&&!valid(action.target+':'+(action.target==='tree'||action.target==='item'?action.id:action.index)))errors.push('reveal 대상 범위 오류');
  if(action.type==='highlight'&&[action.target].flat().some(t=>!valid(t)))errors.push('highlight 대상 범위 오류');
  if(action.type==='pulse'&&!valid(action.target))errors.push('pulse 대상 범위 오류');
 }
 return errors;
}

export function actionWarnings(scene:Scene){return [...scene.narration.flatMap(sentence=>(sentence.cue?.actions??[]).filter(action=>sentenceInstruction(action)&&'ttl_ms' in action&&action.ttl_ms===0&&action.until!=='scene').map(action=>sentence.id+': '+action.type+' — 장면 끝까지 남는 지시 (until:scene으로 의도를 명시하세요)')),...regionLevelWarnings(scene),...(scene.headline?.formula?[scene.id+': headline.formula는 더 이상 표시되지 않습니다. items로 옮기세요.']:[]),...(scene.narration.flatMap(s=>s.cue?.actions??[]).filter(a=>a.type==='handwrite').length>4?[scene.id+': 손글씨 메모는 4개 이하를 권장합니다.']:[]),...scene.narration.flatMap(s=>(s.cue?.actions??[]).filter(a=>a.type==='pointer'||a.type==='circle').length>2?[s.id+': pointer·circle은 한 문장에 2개 이하를 권장합니다.']:[])];}
