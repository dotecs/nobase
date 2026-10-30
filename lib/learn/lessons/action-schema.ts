import { z } from 'zod';
const finite=z.number().finite();
const time=finite.nonnegative().optional();
const timing={at:z.union([finite.nonnegative(),z.string().regex(/^@.+$/)]).optional(),at_ms:time};
const index=z.number().int().nonnegative();
const fn=z.string().regex(/^fn:\d+$/);
const range=z.tuple([finite,finite]).refine(([a,b])=>a<b&&b-a<=200,'축 범위를 확인하세요.');
const target=z.string().min(1);
export const initialStageSchema=z.object({hidden_fns:z.array(index).optional(),hidden_points:z.boolean().optional()});
export const actionSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('param'),name:target,to:finite,from:finite.optional(),...timing,duration_ms:time,easing:z.enum(['linear','ease','ease-in-out']).optional()}),
 z.object({type:z.literal('draw'),target:fn,...timing,duration_ms:time}),
 z.object({type:z.literal('point'),x:finite,y:finite.optional(),on:fn.optional(),label:z.string().optional(),c:z.enum(['c1','c2','c3']).optional(),...timing}).refine(p=>p.y!==undefined||p.on!==undefined,'점에는 y 또는 on이 필요합니다.'),
 z.object({type:z.literal('highlight'),target:z.union([target,z.array(target).min(1)]),dim_others:z.boolean().optional(),...timing}),
 z.object({type:z.literal('reveal'),target:z.enum(['step','node','row']),index,...timing}),
 z.object({type:z.literal('camera'),x:range.optional(),y:range.optional(),cx:finite.optional(),cy:finite.optional(),width:finite.positive().max(200).optional(),...timing,duration_ms:time}).refine(a=>!!(a.x&&a.y)||(a.cx!==undefined&&a.cy!==undefined&&a.width!==undefined),'카메라에 x/y 또는 cx/cy/width가 필요합니다.'),
 z.object({type:z.literal('label'),text:z.string(),tex:z.string().optional(),at:z.object({x:finite,y:finite}),anchor:z.enum(['start','middle','end']).optional(),at_ms:time}),
 z.object({type:z.literal('band'),y:z.tuple([finite,finite]).nullable(),...timing}),
 z.object({type:z.literal('pulse'),target,...timing}),
 z.object({type:z.literal('clear'),what:z.enum(['labels','points','highlight','all']).optional(),...timing}),
]);
export type Action=z.infer<typeof actionSchema>;
