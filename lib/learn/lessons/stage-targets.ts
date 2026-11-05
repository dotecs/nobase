import type { Scene } from './schema';
import { itemsOf, PART_PATTERN } from './items';
import { treeNodes } from './tree';

export function mathInText(text: string) {
  return [...text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]*?)\$/g)].map(match => match[1] ?? match[2]);
}
export function stageMathTargets(stage: Scene['stage']): { target: string; tex: string }[] {
  const targets = itemsOf(stage).filter(item => item.tex).map(item => ({ target:'item:' + item.id, tex:item.tex! }));
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
