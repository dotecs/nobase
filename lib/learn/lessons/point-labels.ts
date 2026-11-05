import type { TargetBox, ChalkPoint } from './chalk';
import { boxAnchor } from './pointing';

export type LabelPosition = 'n' | 's' | 'ne' | 'nw' | 'se' | 'sw';
export type PointLabel = { id: string; x: number; y: number; width: number; height: number; position?: LabelPosition; offset?: ChalkPoint; preferSouth?: boolean };
export type LabelPlacement = { box: TargetBox; mode: 'default' | 'opposite' | 'stack' | 'leader' | 'authored'; leader?: { start: ChalkPoint; end: ChalkPoint } };
export function labelBox(left: number, top: number, width: number, height: number): TargetBox {
  return { left, top, right: left + width, bottom: top + height, x: left + width / 2, y: top + height / 2 };
}
export function overlaps(a: TargetBox, b: TargetBox, gap = 3) {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}
export function defaultLabelBox(label: PointLabel, numberLine: boolean, position = label.position ?? (numberLine ? 's' : 'ne')) {
  const centered = position === 'n' || position === 's', west = position.endsWith('w'), south = position.startsWith('s');
  return labelBox(label.x + (centered ? -label.width / 2 : west ? -label.width - 12 : 12) + (label.offset?.x ?? 0),
    label.y + (south ? (numberLine ? 32 : 12) : -label.height - 12) + (label.offset?.y ?? 0), label.width, label.height);
}
export function labelLeader(box: TargetBox, point: ChalkPoint) {
  const start = boxAnchor(box, point, 'edge', 0);
  const dx = start.x - point.x, dy = start.y - point.y, distance = Math.hypot(dx, dy) || 1;
  return { start, end: { x: point.x + dx / distance * 8, y: point.y + dy / distance * 8 } };
}

/** Uses measured sizes but never the previous placement, so resize/seek cannot oscillate. */
export function placePointLabels(labels: PointLabel[], obstacles: TargetBox[], viewport: TargetBox, numberLine: boolean): Record<string, LabelPlacement> {
  const reserved = new Map(labels.map(label => [label.id, defaultLabelBox(label, numberLine)]));
  const result: Record<string, LabelPlacement> = {};
  const inside = (box: TargetBox) => box.left >= viewport.left && box.right <= viewport.right && box.top >= viewport.top && box.bottom <= viewport.bottom;
  for (const label of labels) {
    const initial = defaultLabelBox(label, numberLine);
    reserved.delete(label.id);
    const occupied = [...obstacles, ...reserved.values()];
    const collides = (box: TargetBox) => occupied.some(other => overlaps(box, other));
    if (label.position) {
      result[label.id] = { box: initial, mode: 'authored' };
    } else {
      const opposite = defaultLabelBox(label, numberLine, numberLine ? 'n' : 'sw');
      const stack = labelBox(initial.left, initial.top + label.height + 6, label.width, label.height);
      const candidates: [LabelPlacement['mode'], TargetBox][] = [['default', initial], ['opposite', opposite], ['stack', stack]];
      if (label.preferSouth) candidates.splice(1, 2, ['stack', stack], ['opposite', opposite]);
      const clear = candidates.find(([, box]) => inside(box) && !collides(box));
      if (clear) result[label.id] = { mode: clear[0], box: clear[1] };
      else {
        const xs = new Set([initial.left, label.x - label.width / 2, viewport.left, viewport.right - label.width, ...occupied.flatMap(box => [box.left - label.width - 6, box.right + 6])]);
        const ys = new Set([initial.top, label.y + 14, viewport.top, viewport.bottom - label.height, ...occupied.flatMap(box => [box.top - label.height - 6, box.bottom + 6])]);
        const spaces = [...xs].flatMap(x => [...ys].map(y => labelBox(x, y, label.width, label.height))).filter(inside);
        const distance = (box: TargetBox) => Math.hypot(box.x - label.x, box.y - label.y);
        spaces.sort((a, b) => (label.preferSouth ? Number(b.top >= label.y) - Number(a.top >= label.y) : 0) || distance(a) - distance(b) || Number(b.top >= label.y) - Number(a.top >= label.y) || a.top - b.top || a.left - b.left);
        const box = spaces.find(candidate => !collides(candidate)) ?? initial;
        result[label.id] = { box, mode: 'leader', leader: labelLeader(box, label) };
      }
    }
    reserved.set(label.id, result[label.id].box);
  }
  // Authored positions are fixed; add only a leader when their final bbox overlaps.
  for (const label of labels.filter(label => label.position)) {
    const placement = result[label.id];
    if ([...obstacles, ...labels.filter(other => other.id !== label.id).map(other => result[other.id].box)].some(box => overlaps(placement.box, box))) placement.leader = labelLeader(placement.box, label);
  }
  return result;
}
