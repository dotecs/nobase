import { InlineMath } from 'react-katex';
import { LessonText } from '@/components/learn/lesson/LessonText';
import { annotationColor } from '@/lib/learn/lessons/annotation-schema';
import { calloutGeometry, calloutTarget, placeCallouts } from '@/lib/learn/lessons/callout';
import { chalkLine, type ChalkSpace, type TargetBox } from '@/lib/learn/lessons/chalk';
import { itemContent } from '@/lib/learn/lessons/items';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import styles from './callout.module.css';

export function CalloutLayer({ state, space, boxes, params = state.params }: {
  state: StageState; space: ChalkSpace; boxes: Record<string, TargetBox>; params?: Record<string, number>;
}) {
  const notes = state.callouts ?? [];
  const ownTargets = new Set(notes.map(note => calloutTarget(note.id, note.action)));
  const placements = placeCallouts(notes.map(({ id, action }) => {
    const box = boxes[calloutTarget(id, action)];
    return { id, x: space.sx(action.position.x), y: space.sy(action.position.y),
      width: box ? box.right - box.left : 0, height: box ? box.bottom - box.top : 0, align: action.align };
  }), Object.entries(boxes).filter(([id]) => !ownTargets.has(id) && /^(item:|memo:|annotation:)/.test(id)).map(([, box]) => box));
  const named = Object.fromEntries(notes.filter(note => note.action.id).map(note => [calloutTarget(note.id, note.action), placements[note.id]]));
  return <g className={styles.layer}>{notes.map(({ id, action, elapsed, opacity }) => {
    const target = calloutTarget(id, action), box = placements[id];
    const source = action.target ? named[action.target] ?? space.target(action.target) : { x: space.sx(action.from!.x), y: space.sy(action.from!.y) };
    const geometry = source && calloutGeometry(action, source, box);
    const lineProgress = Math.max(0, Math.min(1, (elapsed - 80) / 220));
    const textProgress = Math.max(0, Math.min(1, (elapsed - 300) / 100));
    const content = itemContent({ id, tex: action.tex, text: action.text }, params);
    return <g key={id} data-callout={action.id ?? id} opacity={opacity} style={{ color: annotationColor(action.color ?? 'chalk') }}>
      {geometry && <>
        <circle className={styles.dot} cx={geometry.dot.x} cy={geometry.dot.y} r={4} opacity={Math.min(1, elapsed / 80)} />
        <path className={styles.line} d={chalkLine(geometry.points)} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - lineProgress} />
        <polygon className={styles.head} points={geometry.head.map(point => point.x + ',' + point.y).join(' ')} opacity={lineProgress === 1 ? 1 : 0} />
      </>}
      <foreignObject x={box.left} y={box.top} width={1} height={1} overflow="visible">
        <div className={styles.note} data-stage-target={target} data-studio-tint={state.tints?.[target]} data-size={action.size ?? 'md'} data-align={action.align ?? 'middle'}
          style={{ opacity: textProgress, color: annotationColor(state.tints?.[target]) }}>
          {action.tex ? <InlineMath math={'\\displaystyle ' + content} /> : <LessonText authored text={content} />}
        </div>
      </foreignObject>
    </g>;
  })}</g>;
}
