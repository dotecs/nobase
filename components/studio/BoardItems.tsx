import { annotationColor } from '@/lib/learn/lessons/annotation-schema';
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
  const content = (item: BoardItem, grouped = false) => {
    const target = 'item:' + item.id;
    const visible = state.revealed.item?.includes(item.id) ?? true;
    const dimmed = state.highlight?.length && state.dimOthers && !state.highlight.includes(target);
    return <div key={item.id} className={styles.item} data-grouped={grouped}
      data-stage-target={visible ? target : undefined} data-studio-tint={state.tints?.[target]} data-size={item.size ?? 'md'}
      data-align={item.align ?? 'middle'} data-color={item.color} data-weight={item.weight} data-kind={item.kind ?? 'plain'}
      style={{
        color: annotationColor(state.tints?.[target]),
        visibility: visible ? 'visible' : 'hidden',
        opacity: (state.itemOpacity?.[item.id] ?? 1) * (dimmed ? .25 : 1),
      }}>
      {item.tex ? <InlineMath math={'\\displaystyle ' + itemContent(item, params)} /> : <LessonText authored text={itemContent(item, params)} />}
    </div>;
  };
  const anchors = items.filter((item, index) => !item.group || items.findIndex(other => other.group === item.group) === index);
  return <>{anchors.map(item => {
    const position = itemPosition(item, space);
    const grouped = !!item.group;
    // Hidden group members retain their width so revealing a term cannot shift its neighbours.
    const children = grouped ? items.filter(other => other.group === item.group).map(other => content(other, true)) : content(item);
    const anchor = <div className={grouped ? styles.group : styles.anchor} data-item-group={item.group} data-size={item.size ?? 'md'}
      style={{ left: svg ? 0 : position.x, top: svg ? 0 : position.y, gap: grouped ? item.gap ?? '0.6em' : undefined }}>{children}</div>;
    return svg
      ? <foreignObject key={item.id} x={position.x} y={position.y} width={1} height={1} overflow="visible">{anchor}</foreignObject>
      : <div key={item.id}>{anchor}</div>;
  })}</>;
}
