import { z } from 'zod';
import { coordinate } from './coordinate';
import { formulaValues } from './format-num';
import { snapToStep } from './stage-controls';
import type { Scene } from './schema';
import type { ChalkSpace } from './chalk';

export const itemId = z.string().regex(/^[a-z][a-z0-9-]*$/);
export const itemInitial = {
  hidden_items: z.array(itemId).optional(),
  hidden: z.literal('all').optional(),
};
export const itemsSchema = z.array(z.object({
  id: itemId,
  tex: z.string().min(1).max(20000).optional(),
  text: z.string().min(1).max(20000).optional(),
  position: z.object({ x: coordinate, y: coordinate }).optional(),
  group: itemId.optional(),
  gap: z.string().regex(/^\d+(?:\.\d+)?(?:em|px)$/).optional(),
  size: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  align: z.enum(['start', 'middle', 'end']).optional(),
  color: z.enum(['hand', 'accent', 'mint', 'muted']).optional(),
  weight: z.enum(['regular', 'bold']).optional(),
  kind: z.enum(['plain', 'note', 'label']).optional(),
}).refine(item => Boolean(item.tex) !== Boolean(item.text), 'item에는 tex 또는 text 하나만 지정하세요.'));
export type BoardItem = z.infer<typeof itemsSchema>[number];

export function itemsOf(stage: { type: string; items?: BoardItem[] }): BoardItem[] {
  return stage.items ?? [];
}

/** `\p{name}{…}` inside an item's tex marks a part (coefficient, exponent …) that chalk can target as `item:<id>/<name>`. */
export const PART_PATTERN = /\\p\{([a-z][a-z0-9-]*)\}/g;
export function itemParts(item: BoardItem): string[] {
  return [...(item.tex ?? '').matchAll(PART_PATTERN)].map(match => match[1]);
}
export function itemTargetIds(stage: { type: string; items?: BoardItem[] }): Set<string> {
  const ids = new Set<string>();
  for (const item of itemsOf(stage)) { ids.add(item.id); for (const part of itemParts(item)) ids.add(item.id + '/' + part); }
  return ids;
}
/** KaTeX options that turn `\p{name}{…}` into a measurable `data-stage-target` span. */
export function itemKatexOptions(itemId: string) {
  return targetKatexOptions('item:' + itemId);
}
export function targetKatexOptions(target: string) {
  return { trust: (context: { command: string }) => context.command === '\\htmlData', macros: { '\\p': '\\htmlData{stage-target=' + target + '/#1}{#2}' } };
}

export function itemErrors(stage: { type: string; items?: BoardItem[]; initial?: { hidden_items?: string[] }; param?: { name: string } }): string[] {
  const items = itemsOf(stage);
  const ids = new Set(items.map(item => item.id));
  const errors: string[] = [];
  const graph = stage.type === 'graph' || stage.type === 'slider';
  if (ids.size !== items.length) errors.push('item ID 중복');
  for (const item of items) { const parts = itemParts(item); if (new Set(parts).size !== parts.length) errors.push('item 부분 이름 중복: ' + item.id); }
  if ('initial' in stage && stage.initial?.hidden_items?.some(id => !ids.has(id))) errors.push('initial.hidden_items에 없는 item ID가 있습니다.');
  const groups = new Set<string>();
  for (const item of items) {
    const follower = !!item.group && groups.has(item.group);
    if (item.group && stage.type !== 'board') errors.push('group은 board에서만 사용하세요.');
    if (follower && (item.position || item.gap)) errors.push('group의 position과 gap은 첫 item에만 지정하세요.');
    if (!follower && !item.position) errors.push('item 또는 group 첫 항의 position이 필요합니다.');
    if (!item.group && item.gap) errors.push('gap에는 group이 필요합니다.');
    if (item.group) groups.add(item.group);
    if (!graph && Object.values(item.position ?? {}).some(value => value < 0 || value > 1)) errors.push('비그래프 item 좌표는 0~1이어야 합니다: ' + item.id);
    for (const match of (item.tex ?? item.text ?? '').matchAll(/\{\{([^}]+)\}\}/g)) {
      if (stage.type !== 'slider' || match[1] !== stage.param?.name) errors.push('없는 item 파라미터: ' + match[1]);
    }
  }
  return errors;
}

export function itemParameters(stage: Scene['stage'], params: Record<string, number>) {
  return stage.type === 'slider'
    ? { ...params, [stage.param.name]: snapToStep(params[stage.param.name] ?? stage.param.init, stage.param) }
    : params;
}

export function itemContent(item: BoardItem, params: Record<string, number>) {
  if (item.tex) return formulaValues(item.tex, params);
  return (item.text ?? '').split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g).map(part => part.startsWith('$')
    ? formulaValues(part, params)
    : part.replace(/(?:[+\-−]\s*)?\{\{[a-zA-Z]+\}\}/g, value => '$' + formulaValues(value, params) + '$')
  ).join('');
}

/** Graph callers supply data scales; other stages supply normalized canvas scales. */
export function itemPosition(item: BoardItem, space: Pick<ChalkSpace, 'sx' | 'sy'>) {
  return { x: space.sx(item.position!.x), y: space.sy(item.position!.y) };
}
