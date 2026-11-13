import type { Scene } from './schema';
import { itemsOf, PART_PATTERN } from './items';
import { treeNodes } from './tree';

export function mathInText(text: string) {
  return [...text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]*?)\$/g)].map(match => match[1] ?? match[2]);
}
/** 풀이 무대의 문제 문장에서 `[[이름|구절]]`은 밑줄·메모가 가리킬 수 있는 구절이다. */
export const PROBLEM_MARK = /\[\[([a-z][a-z0-9-]*)\|([\s\S]+?)\]\]/g;
export function problemMarks(text: string) { return [...text.matchAll(PROBLEM_MARK)].map(match => match[1]); }
export function problemPlain(text: string) { return text.replace(PROBLEM_MARK, '$2'); }
/** 문제가 고정된 풀이 무대(시험지 지면). 여백 메모를 쓸 수 있도록 비율 좌표 캔버스로 다룬다. */
export function paperStage(stage: { type: string; problem?: string }) { return stage.type === 'steps' && !!stage.problem; }
export function stageMathTargets(stage: Scene['stage']): { target: string; tex: string }[] {
  const targets = itemsOf(stage).filter(item => item.tex).map(item => ({ target:'item:' + item.id, tex:item.tex! }));
  // 문제 문장: 수식의 \p{…}와 [[이름|구절]]이 같은 이름 공간(problem/<이름>)을 쓴다.
  if (stage.type === 'steps' && stage.problem) targets.push({ target:'problem', tex:mathInText(problemPlain(stage.problem)).join(' ') + problemMarks(stage.problem).map(name => '\\p{' + name + '}{}').join('') });
  if (stage.type === 'steps') stage.steps.forEach((step, i) => targets.push({target:'step:' + i,tex:step.tex}));
  if (stage.type === 'chain') stage.nodes.forEach((node, i) => { if (node.tex) targets.push({target:'node:' + i,tex:node.tex}); });
  if (stage.type === 'tree') treeNodes(stage.root).forEach(({node}) => { if (node.tex) targets.push({target:'tree:' + node.id,tex:node.tex}); });
  if (stage.type === 'table') stage.rows.forEach((row, r) => row.cells.forEach((cell, c) => targets.push({target:`cell:${r}:${c}`,tex:mathInText(cell).join(' ')})));
  return targets;
}
export function partTargetIds(target: string, tex: string) {
  return [...tex.matchAll(PART_PATTERN)].map(match => target + '/' + match[1]);
}
export function stageTargetIds(stage: Scene['stage']) {
  return new Set([...itemsOf(stage).map(item => 'item:' + item.id), ...stageMathTargets(stage).flatMap(({target,tex}) => [target,...partTargetIds(target,tex)])]);
}
export function duplicateParts(target: string, tex: string): string[] {
  const parts = partTargetIds(target,tex);
  return parts.length === new Set(parts).size ? [] : ['부분 이름 중복: ' + target];
}
