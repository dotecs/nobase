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
  position: z.object({ x: coordinate, y: coordinate }),
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

export function itemErrors(stage: { type: string; items?: BoardItem[]; initial?: { hidden_items?: string[] }; param?: { name: string } }): string[] {
  const items = itemsOf(stage);
  const ids = new Set(items.map(item => item.id));
  const errors: string[] = [];
  const graph = stage.type === 'graph' || stage.type === 'slider';
  if (ids.size !== items.length) errors.push('item ID 중복');
  if ('initial' in stage && stage.initial?.hidden_items?.some(id => !ids.has(id))) errors.push('initial.hidden_items에 없는 item ID가 있습니다.');
  for (const item of items) {
    if (!graph && Object.values(item.position).some(value => value < 0 || value > 1)) errors.push('비그래프 item 좌표는 0~1이어야 합니다: ' + item.id);
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
  return { x: space.sx(item.position.x), y: space.sy(item.position.y) };
}
