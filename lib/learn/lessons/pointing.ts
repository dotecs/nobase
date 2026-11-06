import type { ChalkPoint, ChalkSpace, TargetBox } from './chalk';
import { expressionNumber } from './coordinate';

export type BoundaryAnchor = 'edge' | 'center' | 'top' | 'bottom' | 'left' | 'right';

export function boxAnchor(box: TargetBox, from: ChalkPoint, anchor: BoundaryAnchor = 'edge', gap = 4): ChalkPoint {
  if (anchor === 'center') return { x: box.x, y: box.y };
  if (anchor === 'top') return { x: box.x, y: box.top - gap };
  if (anchor === 'bottom') return { x: box.x, y: box.bottom + gap };
  if (anchor === 'left') return { x: box.left - gap, y: box.y };
  if (anchor === 'right') return { x: box.right + gap, y: box.y };
  const dx = from.x - box.x, dy = from.y - box.y, distance = Math.hypot(dx, dy);
  if (!distance) return { x: box.right + gap, y: box.y };
  const edge = Math.min(dx ? (box.right - box.left) / 2 / Math.abs(dx) : Infinity, dy ? (box.bottom - box.top) / 2 / Math.abs(dy) : Infinity);
  return { x: box.x + dx * edge + gap * dx / distance, y: box.y + dy * edge + gap * dy / distance };
}

export function targetAnchor(target: string, from: ChalkPoint, space: ChalkSpace, anchor: BoundaryAnchor = 'edge'): ChalkPoint | null {
  const box = space.target(target);
  if (!box) return null;
  if (!target.startsWith('point:') || anchor === 'center') return boxAnchor(box, from, anchor);
  const direction = anchor === 'edge' ? from : boxAnchor(box, from, anchor);
  const dx = direction.x - box.x, dy = direction.y - box.y, distance = Math.hypot(dx, dy) || 1;
  return { x: box.x + (distance === 1 && !dx && !dy ? 9 : dx / distance * 9), y: box.y + dy / distance * 9 };
}

export function tickValue(target: string): number | null {
  if (!target.startsWith('tick:')) return null;
  try { return expressionNumber(target.slice(5)); } catch { return null; }
}

export function arrowEndpoints(from: string | ChalkPoint, to: string | ChalkPoint, space: ChalkSpace) {
  const source = typeof from === 'string' ? space.target(from) : { x: space.sx(from.x), y: space.sy(from.y) };
  const destination = typeof to === 'string' ? space.target(to) : { x: space.sx(to.x), y: space.sy(to.y) };
  if (!source || !destination) return null;
  const start = typeof from === 'string' ? targetAnchor(from, destination, space) : source;
  const end = typeof to === 'string' ? targetAnchor(to, source, space) : destination;
  return start && end ? { start, end } : null;
}

/** Endpoints for a bent arrow: from/to the top (bend up) or bottom (bend down) edge midpoints, 6px outside. */
export function bentArrowEndpoints(from: string | ChalkPoint, to: string | ChalkPoint, bend: 'up' | 'down', space: ChalkSpace) {
  const edge = (value: string | ChalkPoint) => {
    if (typeof value !== 'string') return { x: space.sx(value.x), y: space.sy(value.y) };
    const box = space.target(value) as { left: number; right: number; top: number; bottom: number } | null;
    if (!box) return null;
    return { x: (box.left + box.right) / 2, y: bend === 'up' ? box.top - 6 : box.bottom + 6 };
  };
  const start = edge(from), end = edge(to);
  return start && end ? { start, end } : null;
}
