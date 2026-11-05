import { z } from 'zod';
import { coordinate } from './coordinate';

const endpoint = z.union([z.literal('-inf'), z.literal('inf'), coordinate]);
export function regionValue(value: number | '-inf' | 'inf') {
  return value === '-inf' ? -Infinity : value === 'inf' ? Infinity : value;
}
export const regionRangeSchema = z.object({
  from: endpoint, to: endpoint, open: z.enum(['from', 'to', 'both']).optional(),
}).superRefine((range, context) => {
  const from = regionValue(range.from), to = regionValue(range.to);
  if (from > to || from === Infinity || to === -Infinity) context.addIssue({ code:'custom', message:'region 범위의 시작은 끝보다 작거나 같아야 합니다.' });
  if (from === to && range.open) context.addIssue({ code:'custom', message:'한 점 region은 닫힌 범위여야 합니다.' });
});
export const regionSchema = z.object({
  type: z.literal('region'), until:z.enum(['sentence','scene']).optional(), id: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
  ranges: z.array(regionRangeSchema).min(1), level: z.number().int().min(1).optional(),
  color: z.enum(['accent', 'mint', 'mark', 'hand', 'chalk']).optional(),
  label: z.string().min(1).max(20000).optional(),
  intersect_with: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
  at: z.union([z.number().finite().nonnegative(), z.string().regex(/^@.+$/)]).optional(),
  at_ms: z.number().finite().nonnegative().optional(), ttl_ms: z.number().finite().nonnegative().optional(),
});
export type RegionAction = z.infer<typeof regionSchema>;
export type RegionRange = z.infer<typeof regionRangeSchema>;
export type RegionMark = { id: string; action: RegionAction; elapsed: number; opacity: number };
