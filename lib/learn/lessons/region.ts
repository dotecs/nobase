import { regionValue, type RegionRange, type RegionMark } from './region-schema';
import { labelBox, overlaps } from './point-labels';
import type { TargetBox } from './chalk';

export type RegionInterval = { from: number; to: number; openFrom: boolean; openTo: boolean };
export function regionInterval(range: RegionRange): RegionInterval {
  return { from:regionValue(range.from), to:regionValue(range.to),
    openFrom:range.from === '-inf' || range.open === 'from' || range.open === 'both',
    openTo:range.to === 'inf' || range.open === 'to' || range.open === 'both' };
}
function contains(range: RegionInterval, value: number) {
  return (value > range.from || value === range.from && !range.openFrom)
    && (value < range.to || value === range.to && !range.openTo);
}

/** Union overlapping results so a translucent intersection is painted only once. */
export function intersectRegions(a: RegionRange[], b: RegionRange[]): RegionInterval[] {
  const intersections: RegionInterval[] = [];
  for (const left of a.map(regionInterval)) for (const right of b.map(regionInterval)) {
    const from = Math.max(left.from, right.from), to = Math.min(left.to, right.to);
    const openFrom = !contains(left, from) || !contains(right, from);
    const openTo = !contains(left, to) || !contains(right, to);
    if (from < to || from === to && !openFrom && !openTo) intersections.push({ from, to, openFrom, openTo });
  }
  intersections.sort((a, b) => a.from - b.from || Number(a.openFrom) - Number(b.openFrom));
  const merged: RegionInterval[] = [];
  for (const range of intersections) {
    const previous = merged.at(-1);
    if (!previous || range.from > previous.to || range.from === previous.to && range.openFrom && previous.openTo) {
      merged.push({ ...range });
      continue;
    }
    if (range.to > previous.to) { previous.to = range.to; previous.openTo = range.openTo; }
    else if (range.to === previous.to) previous.openTo = previous.openTo && range.openTo;
  }
  return merged;
}

export type RegionGeometry = {
  index: number; order: number; left: number; right: number; y: number; axisY: number; point: boolean;
  fromMarker: boolean; toMarker: boolean; leftArrow: boolean; rightArrow: boolean;
  openFrom: boolean; openTo: boolean; box: TargetBox;
};
/** Thin rendered shapes, rather than the empty interior of each range. */
export function regionPointLabelObstacles(ranges: RegionGeometry[]): TargetBox[] {
  return ranges.flatMap(range => [
    ...(!range.point ? [labelBox(range.left, range.y - 1, range.right - range.left, 2)] : []),
    ...[range.fromMarker ? range.left : null, range.toMarker && !range.point ? range.right : null].flatMap(x => x === null ? [] : [
      labelBox(x - 5, range.axisY - 5, 10, 10),
      ...(!range.point ? [labelBox(x - 1, range.y, 2, range.axisY - range.y)] : []),
    ]),
    ...(range.leftArrow ? [labelBox(range.left, range.y - 5, 9, 10)] : []),
    ...(range.rightArrow ? [labelBox(range.right - 9, range.y - 5, 9, 10)] : []),
  ]);
}
export function regionGeometry(mark: RegionMark, sx: (x: number) => number, axisY: number, domain: [number, number],levelHeight=28): RegionGeometry[] {
  const y = axisY - (mark.action.level ?? 1) * levelHeight;
  return mark.action.ranges.map((range, index) => ({ ...regionInterval(range), index }))
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .map((range, order) => ({ ...range, order }))
    .filter(range => range.to >= domain[0] && range.from <= domain[1])
    .map(range => {
      const left = sx(Math.max(range.from, domain[0])), right = sx(Math.min(range.to, domain[1]));
      const fromMarker = Number.isFinite(range.from) && range.from >= domain[0];
      const toMarker = Number.isFinite(range.to) && range.to <= domain[1];
      const point = range.from === range.to;
      const arrow = range.from === -Infinity || range.to === Infinity;
      const top = y - (arrow ? 4 : .75), bottom = fromMarker || toMarker ? axisY + 5 : y + (arrow ? 4 : .75);
      return { index:range.index, order:range.order, left, right, y, axisY, point, fromMarker, toMarker,
        leftArrow:range.from === -Infinity, rightArrow:range.to === Infinity,
        openFrom:range.openFrom, openTo:range.openTo,
        box:point ? labelBox(left - 5, axisY - 5, 10, 10)
          : labelBox(left - (fromMarker ? 5 : 0), top, right - left + (fromMarker ? 5 : 0) + (toMarker ? 5 : 0), bottom - top) };
    });
}
export function regionBox(ranges: RegionGeometry[]): TargetBox | null {
  if (!ranges.length) return null;
  const left = Math.min(...ranges.map(range => range.box.left)), top = Math.min(...ranges.map(range => range.box.top));
  return labelBox(left, top, Math.max(...ranges.map(range => range.box.right)) - left, Math.max(...ranges.map(range => range.box.bottom)) - top);
}
export function regionTargets(marks: RegionMark[], geometries: Record<string, RegionGeometry[]>): Record<string, TargetBox> {
  const targets: Record<string, TargetBox> = {};
  for (const mark of marks) {
    if (!mark.action.id) continue;
    const ranges = geometries[mark.id], box = regionBox(ranges);
    if (box) targets['region:' + mark.action.id] = box;
    for (const range of ranges) targets['region:' + mark.action.id + '/' + range.index] = range.box;
  }
  return targets;
}
export function regionProgress(elapsed: number, order: number, count: number) {
  const progress = Math.max(0, Math.min(1, elapsed / 400 * count - order));
  return { marker:Math.min(1, progress / .2), vertical:Math.max(0, Math.min(1, (progress - .2) / .3)), horizontal:Math.max(0, Math.min(1, (progress - .5) / .5)) };
}

/** Measured labels move upward from their authored levels, independent of their last DOM position. */
export function placeRegionLabels(labels: { id:string; x:number; bottom:number; width:number; height:number }[], obstacles: TargetBox[]) {
  const occupied = [...obstacles], result: Record<string, TargetBox> = {};
  for (const label of [...labels].sort((a, b) => a.bottom - b.bottom)) {
    let box = labelBox(label.x - label.width / 2, label.bottom - label.height, label.width, label.height);
    for (let step = 0; step < occupied.length; step++) {
      const collisions = occupied.filter(other => overlaps(box, other, 4));
      if (!collisions.length) break;
      box = labelBox(box.left, Math.min(...collisions.map(other => other.top)) - label.height - 5, label.width, label.height);
    }
    result[label.id] = box; occupied.push(box);
  }
  return result;
}
