import { z } from 'zod';
import { coordinate } from './coordinate';
import { labelBox } from './point-labels';
import type { TargetBox } from './chalk';
export const nearSchema=z.object({near:z.string().min(1).max(160),side:z.enum(['below','above','left','right']).optional(),gap:z.number().finite().nonnegative().optional()});
export const positionSchema=z.union([z.object({x:coordinate,y:coordinate}),nearSchema]);
export type NearPosition=z.infer<typeof nearSchema>;
export type Position=z.infer<typeof positionSchema>;
export function nearBox(target:TargetBox,width:number,height:number,side:NearPosition['side']='below',gap=12) {
  return labelBox(side==='left'?target.left-gap-width:side==='right'?target.right+gap:target.x-width/2,
    side==='above'?target.top-gap-height:side==='below'?target.bottom+gap:target.y-height/2,width,height);
}
