import {instructionColor,targetOpacity} from '@/lib/learn/lessons/instruction-style';
import { InlineMath } from 'react-katex';
import { annotationColor } from '@/lib/learn/lessons/annotation-schema';
import { intersectRegions, placeRegionLabels, regionBox, regionProgress, type RegionGeometry } from '@/lib/learn/lessons/region';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import type { TargetBox } from '@/lib/learn/lessons/chalk';
import styles from './region.module.css';

export function RegionLayer({ state, geometries, boxes, sx, axisY, domain }: {
  state: StageState; geometries: Record<string, RegionGeometry[]>; boxes: Record<string, TargetBox>;
  sx: (x: number) => number; axisY: number; domain: [number, number];
}) {
  const marks = state.regions ?? [];
  const labels = placeRegionLabels(marks.flatMap(mark => {
    const box = regionBox(geometries[mark.id]), measured = boxes['region-label:' + mark.id];
    return mark.action.label && box ? [{ id:mark.id, x:box.x, bottom:Math.min(...geometries[mark.id].map(range => range.point ? axisY : range.y)) - 8,
      width:measured ? measured.right - measured.left : 0, height:measured ? measured.bottom - measured.top : 0 }] : [];
  }), Object.entries(boxes).filter(([id]) => /^(tick:|ytick:|item:|annotation:|memo:)/.test(id)).map(([, box]) => box));
  return <g className={styles.layer}>
    {marks.map(mark => {
      if (!mark.action.intersect_with) return null;
      const reference = marks.find(other => other.action.id === mark.action.intersect_with);
      if (!reference) return null;
      return <g key={'intersection:' + mark.id} data-region-intersection={mark.action.id ?? mark.id} opacity={Math.min(mark.opacity, reference.opacity)}>
        {intersectRegions(mark.action.ranges, reference.action.ranges).map((range, index) => {
          if (range.to < domain[0] || range.from > domain[1]) return null;
          const left = sx(Math.max(range.from, domain[0])) + (range.openFrom && range.from >= domain[0] ? 1 : 0);
          const right = sx(Math.min(range.to, domain[1])) - (range.openTo && range.to <= domain[1] ? 1 : 0);
          const point = range.from === range.to;
          return <rect key={index} className={styles.band} data-open-from={range.openFrom} data-open-to={range.openTo}
            x={point ? left - 1 : left} y={axisY - 6} width={point ? 2 : Math.max(0, right - left)} height={6} />;
        })}
      </g>;
    })}
    {marks.map(mark => {
      const parent = 'region:' + (mark.action.id ?? mark.id), ranges = geometries[mark.id];
      const color = instructionColor(state,parent,annotationColor(mark.action.color??'accent')) ?? annotationColor(mark.action.color??'accent');
      return <g key={mark.id} data-region={mark.action.id ?? mark.id} opacity={mark.opacity} style={{ color }}>
        {ranges.map(range => {
          const progress = regionProgress(mark.elapsed, range.order, mark.action.ranges.length), target = parent + '/' + range.index;
          return <g key={range.index} data-region-range={target} data-level={mark.action.level ?? 1}
            opacity={targetOpacity(state,target,.22)} style={{ color:instructionColor(state,target) }}>
            {!range.point && <>
              {range.fromMarker && <line data-region-vertical="from" x1={range.left} x2={range.left} y1={axisY} y2={axisY + (range.y - axisY) * progress.vertical} />}
              {range.toMarker && <line data-region-vertical="to" x1={range.right} x2={range.right} y1={axisY} y2={axisY + (range.y - axisY) * progress.vertical} />}
              <line data-region-horizontal x1={range.left} x2={range.right} y1={range.y} y2={range.y}
                pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress.horizontal} />
              {range.leftArrow && <path data-region-arrow="left" d={`M${range.left + 9} ${range.y - 4} L${range.left} ${range.y} L${range.left + 9} ${range.y + 4}`} opacity={progress.horizontal === 1 ? 1 : 0} />}
              {range.rightArrow && <path data-region-arrow="right" d={`M${range.right - 9} ${range.y - 4} L${range.right} ${range.y} L${range.right - 9} ${range.y + 4}`} opacity={progress.horizontal === 1 ? 1 : 0} />}
            </>}
            {range.fromMarker && <circle data-region-end="from" data-open={range.openFrom} className={range.openFrom ? styles.open : styles.closed} cx={range.left} cy={axisY} r={5} opacity={progress.marker} />}
            {!range.point && range.toMarker && <circle data-region-end="to" data-open={range.openTo} className={range.openTo ? styles.open : styles.closed} cx={range.right} cy={axisY} r={5} opacity={progress.marker} />}
          </g>;
        })}
        {mark.action.label && labels[mark.id] && <foreignObject x={labels[mark.id].left} y={labels[mark.id].top} width={1} height={1} overflow="visible"
          opacity={targetOpacity(state,parent,.22) * Math.min(1, mark.elapsed / 400)}>
          <div className={styles.label} data-stage-target={'region-label:' + mark.id}><InlineMath math={mark.action.label} /></div>
        </foreignObject>}
      </g>;
    })}
  </g>;
}
