import type { CalloutAction } from './annotation-schema';
import type { ChalkPoint, TargetBox } from './chalk';
import { boxAnchor } from './pointing';
import { labelBox, overlaps } from './point-labels';

export function calloutTarget(id: string, action: CalloutAction) {
  return action.id ? 'item:' + action.id : id;
}

/** Always start from authored coordinates, never from the preceding render's placement. */
export function placeCallouts(notes: { id: string; x: number; y: number; width: number; height: number; align?: CalloutAction['align'] }[], obstacles: TargetBox[]) {
  const occupied = [...obstacles];
  const result: Record<string, TargetBox> = {};
  for (const note of notes) {
    const left = note.x - (note.align === 'start' ? 0 : note.align === 'end' ? note.width : note.width / 2);
    let box = labelBox(left, note.y, note.width, note.height);
    // Each step passes at least one obstacle's bottom edge.
    for (let step = 0; step < occupied.length; step++) {
      const collisions = occupied.filter(other => overlaps(box, other, 6));
      if (!collisions.length) break;
      box = labelBox(left, Math.max(...collisions.map(other => other.bottom)) + 7, note.width, note.height);
    }
    result[note.id] = box;
    occupied.push(box);
  }
  return result;
}

export function calloutGeometry(action: CalloutAction, source: TargetBox | ChalkPoint, note: TargetBox) {
  const anchor = action.anchor ?? 'bottom';
  const dot = 'left' in source ? boxAnchor(source, note, anchor, 6) : source;
  const opposite = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' } as const;
  const end = boxAnchor(note, dot, opposite[anchor], 6);
  const drop = action.drop ?? 24;
  const vertical = anchor === 'top' || anchor === 'bottom';
  const direction = anchor === 'top' || anchor === 'left' ? -1 : 1;
  const turn = vertical ? { x: dot.x, y: dot.y + direction * drop } : { x: dot.x + direction * drop, y: dot.y };
  const corner = vertical ? { x: end.x, y: turn.y } : { x: turn.x, y: end.y };
  const points = (action.route === 'straight' ? [dot, end] : [dot, turn, corner, end])
    .filter((point, index, all) => !index || point.x !== all[index - 1].x || point.y !== all[index - 1].y);
  const previous = points.at(-2) ?? { x: end.x, y: end.y - 1 };
  const distance = Math.hypot(end.x - previous.x, end.y - previous.y) || 1;
  const dx = (end.x - previous.x) / distance, dy = (end.y - previous.y) / distance;
  const head = [end, { x: end.x - dx * 9 - dy * 4, y: end.y - dy * 9 + dx * 4 }, { x: end.x - dx * 9 + dy * 4, y: end.y - dy * 9 - dx * 4 }];
  return { dot, end, points, head };
}
