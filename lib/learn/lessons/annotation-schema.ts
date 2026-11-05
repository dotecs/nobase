import { z } from 'zod';
import { coordinate } from './coordinate';

const finite = z.number().finite();
const point = z.object({ x: coordinate, y: coordinate });
const timing = {
  until: z.enum(['sentence','scene']).optional(),
  at: z.union([finite.nonnegative(), z.string().regex(/^@.+$/)]).optional(),
  at_ms: finite.nonnegative().optional(), ttl_ms: finite.nonnegative().optional(),
};
export const tintColors = z.enum(['mint', 'accent', 'mark', 'hand']);
export type TintColor = z.infer<typeof tintColors>;
export const tintSchema = z.object({ type: z.literal('tint'), target: z.string().min(1).max(160), color: tintColors, ...timing });

export const calloutSchema = z.object({
  type: z.literal('callout'), id: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
  target: z.string().min(1).max(160).optional(), from: point.optional(),
  anchor: z.enum(['top', 'bottom', 'left', 'right']).optional(),
  position: point, tex: z.string().min(1).max(20000).optional(), text: z.string().min(1).max(20000).optional(),
  color: z.enum(['mint', 'accent', 'mark', 'hand', 'chalk']).optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(), align: z.enum(['start', 'middle', 'end']).optional(),
  route: z.enum(['elbow', 'straight']).optional(), drop: finite.nonnegative().optional(), ...timing,
}).refine(action => Boolean(action.target) !== Boolean(action.from), 'callout에는 target 또는 from 하나를 지정하세요.')
  .refine(action => Boolean(action.tex) !== Boolean(action.text), 'callout에는 tex 또는 text 하나를 지정하세요.');
export type CalloutAction = z.infer<typeof calloutSchema>;

export function annotationColor(color: TintColor | 'chalk' | undefined) {
  return color ? 'var(--studio-tint-' + color + ')' : undefined;
}
