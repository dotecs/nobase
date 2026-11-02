import { InlineMath } from 'react-katex';
import { LessonText } from '@/components/learn/lesson/LessonText';
import { itemContent, itemPosition, type BoardItem } from '@/lib/learn/lessons/items';
import type { ChalkSpace } from '@/lib/learn/lessons/chalk';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import styles from './items.module.css';

export function BoardItems({ items, state, params, space, svg = false }: {
  items: BoardItem[];
  state: StageState;
  params: Record<string, number>;
  space: Pick<ChalkSpace, 'sx' | 'sy'>;
  svg?: boolean;
}) {
  return <>{items.filter(item => state.revealed.item?.includes(item.id) ?? true).map(item => {
    const position = itemPosition(item, space);
    const target = 'item:' + item.id;
    const dimmed = state.highlight?.length && state.dimOthers && !state.highlight.includes(target);
    const content = <div
      className={styles.item} data-stage-target={target} data-size={item.size ?? 'md'}
      data-align={item.align ?? 'middle'} data-color={item.color}
      style={{ left: svg ? 0 : position.x, top: svg ? 0 : position.y, opacity: (state.itemOpacity?.[item.id] ?? 1) * (dimmed ? .25 : 1) }}
    >{item.tex ? <InlineMath math={itemContent(item, params)} /> : <LessonText authored text={itemContent(item, params)} />}</div>;
    return svg
      ? <foreignObject key={item.id} x={position.x} y={position.y} width={1} height={1} overflow="visible">{content}</foreignObject>
      : <div key={item.id} className={styles.anchor}>{content}</div>;
  })}</>;
}
