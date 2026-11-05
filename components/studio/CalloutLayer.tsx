import {nearBox} from '@/lib/learn/lessons/position';
import { StudioMath } from './StudioMath';
import { LessonText } from '@/components/learn/lesson/LessonText';
import { annotationColor } from '@/lib/learn/lessons/annotation-schema';
import {instructionColor} from '@/lib/learn/lessons/instruction-style';
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
  const placements = space.portrait&&space.noteBoxes ? Object.fromEntries(notes.map(note=>[note.id,space.noteBoxes![calloutTarget(note.id,note.action)]])) : placeCallouts(notes.map(({ id, action }) => {
    const box = boxes[calloutTarget(id, action)];
    const near='near' in action.position?action.position:null,target=near?space.target(near.near):null,relative=target&&near?nearBox(target,box?box.right-box.left:0,box?box.bottom-box.top:0,near.side,near.gap):null;
    return { id, x: relative?relative.x:'x' in action.position?space.sx(action.position.x):0, y: relative?relative.top:'y' in action.position?space.sy(action.position.y):0,
      width: box ? box.right - box.left : 0, height: box ? box.bottom - box.top : 0, align: action.align };
  }), Object.entries(boxes).filter(([id]) => ![...ownTargets].some(target => id === target || id.startsWith(target + '/')) && /^(item:|memo:|annotation:)/.test(id)).map(([, box]) => box));
  const named = Object.fromEntries(notes.filter(note => note.action.id).map(note => [calloutTarget(note.id, note.action), placements[note.id]]));
  return <g className={styles.layer}>{notes.map(({ id, action, elapsed, opacity }) => {
    const target = calloutTarget(id, action), box = placements[id];
    const source = action.target ? named[action.target] ?? space.target(action.target) : { x: space.sx(action.from!.x), y: space.sy(action.from!.y) };
    const geometry = source && box && calloutGeometry(space.portrait?{...action,anchor:action.anchor==='top'?'top':'bottom',drop:16}:action, source, box,space.portrait);
    if(!box)return null;
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
          style={{ opacity: textProgress, color: instructionColor(state,target),maxWidth:space.portrait?Math.abs(space.sx(space.x[1])-space.sx(space.x[0]))-24:undefined }}>
          {action.tex ? <StudioMath state={state} tex={content} target={target} /> : <LessonText authored text={content} />}
        </div>
      </foreignObject>
    </g>;
  })}</g>;
}
