import type { ChalkAction } from './chalk-schema';
import { linePoints, type TargetBox } from './chalk';
export type StrikeAction = Extract<ChalkAction,{type:'strike'}>;
/** Array order is authored order; pairs share one start time. */
export function strikeTargets(action: StrikeAction, elapsed: number) {
  const groups = action.pairs ?? (action.targets ?? [action.target!]).map(target => [target]);
  return groups.flatMap((targets,i) => {
    const local = elapsed - i * (action.stagger_ms ?? 200);
    return local < 0 ? [] : targets.map(target => ({target,progress:Math.min(1,local/400)}));
  });
}
export function strikePoints(box: TargetBox, direction: '/'|'\\' = '/') {
  const from = {x:box.left,y:direction === '/' ? box.bottom : box.top};
  const to = {x:box.right,y:direction === '/' ? box.top : box.bottom};
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy)||1;
  return linePoints({x:from.x-4*dx/length,y:from.y-4*dy/length},{x:to.x+4*dx/length,y:to.y+4*dy/length});
}
