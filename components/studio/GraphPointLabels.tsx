import { useMemo } from 'react';
import { InlineMath } from 'react-katex';
import { formatExact } from '@/lib/learn/lessons/format-num';
import { labelBox, placePointLabels, type PointLabel } from '@/lib/learn/lessons/point-labels';
import type { TargetBox } from '@/lib/learn/lessons/chalk';
import type { StagePoint } from '@/lib/learn/lessons/stage-state';
import { regionPointLabelObstacles, type RegionGeometry } from '@/lib/learn/lessons/region';
import styles from './graph.module.css';

export function GraphPointLabels({ points, boxes, sx, sy, viewport, numberLine, opacity, regions = [] }: {
  points: StagePoint[]; boxes: Record<string, TargetBox>; sx: (n: number) => number; sy: (n: number) => number;
  viewport: TargetBox; numberLine: boolean; regions?: RegionGeometry[]; opacity: (id: string) => number;
}) {
  const round = (value: number) => Math.round(value * 10) / 10;
  const labels = points.filter(point => point.label);
  const measured = labels.every(point => boxes['label:' + point.id]);
  const input = {
    labels: labels.map(point => ({ id: point.id, x: round(sx(point.x)), y: round(sy(point.y)), width: round(boxes['label:' + point.id]?.right - boxes['label:' + point.id]?.left || 160), height: round(boxes['label:' + point.id]?.bottom - boxes['label:' + point.id]?.top || 40), preferSouth: numberLine && regions.some(range => Math.abs(sy(point.y) - range.axisY) < .1 && (range.fromMarker && Math.abs(sx(point.x) - range.left) < .1 || range.toMarker && Math.abs(sx(point.x) - range.right) < .1)), position: point.label_pos, offset: point.label_offset })),
    obstacles: [...Object.entries(boxes).filter(([id]) => ['tick:', 'ytick:', 'item:', 'memo:', 'annotation:', 'region-label:'].some(prefix=>id.startsWith(prefix))).map(([, box]) => Object.fromEntries(Object.entries(box).map(([key, value]) => [key, round(value)])) as TargetBox), ...regionPointLabelObstacles(regions), ...points.map(point => labelBox(round(sx(point.x)) - 8, round(sy(point.y)) - 8, 16, 16))],
    viewport, numberLine,
  };
  const key = JSON.stringify(input);
  const placements = useMemo(() => {
    const data = JSON.parse(key) as { labels: PointLabel[]; obstacles: TargetBox[]; viewport: TargetBox; numberLine: boolean };
    return placePointLabels(data.labels, data.obstacles, data.viewport, data.numberLine);
  }, [key]);
  return <>{labels.map(point => {
    const position = point.label_pos ?? (numberLine ? 's' : 'ne');
    const centered = position === 'n' || position === 's', west = position.endsWith('w'), south = position.startsWith('s');
    const placement = measured ? placements[point.id] : undefined;
    const x = placement?.box.left ?? sx(point.x) + (centered ? 0 : west ? -12 : 12) + (point.label_offset?.x ?? 0);
    const y = placement?.box.top ?? sy(point.y) + (south ? numberLine ? 32 : 12 : -12) + (point.label_offset?.y ?? 0);
    const text = point.label === 'auto' ? (numberLine ? point.x_tex ?? formatExact(point.x, 'tex') : '(' + (point.x_tex ?? formatExact(point.x, 'tex')) + ', ' + (point.y_tex ?? formatExact(point.y, 'tex')) + ')') : point.label!;
    return <g key={point.id} opacity={opacity(point.id)} data-label-mode={placement?.mode ?? 'initial'}>
      {placement?.leader && <line data-label-leader={point.id} className={styles.leader} x1={placement.leader.start.x} y1={placement.leader.start.y} x2={placement.leader.end.x} y2={placement.leader.end.y} />}
      <foreignObject x={x} y={y} width={1} height={1} overflow="visible">
        <div className={styles.pointLabel} data-stage-target={'label:' + point.id} style={{ width: 'max-content', transform: measured ? undefined : `translate(${centered ? '-50%' : west ? '-100%' : '0'}, ${south ? '0' : '-100%'})` }}><InlineMath math={'\\displaystyle ' + text} /></div>
      </foreignObject>
    </g>;
  })}</>;
}
