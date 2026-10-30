import {z} from 'zod';
const finite=z.number().finite(),point=z.object({x:finite,y:finite}),target=z.string().min(1).max(160);
const common={position:point.optional(),at:z.union([finite.nonnegative(),z.string().regex(/^@.+$/),point]).optional(),at_ms:finite.nonnegative().optional(),ttl_ms:finite.nonnegative().optional(),color:z.enum(['chalk','accent']).optional()};
const hasPoint=(a:{at?:unknown;position?:unknown})=>!!a.position||(typeof a.at==='object'&&a.at!==null);
export const chalkOptions=[
 z.object({type:z.literal('pointer'),...common,target:target.optional()}).refine(a=>hasPoint(a)||!!a.target,'pointer 좌표 또는 대상이 필요합니다.'),
 z.object({type:z.literal('circle'),...common,rx:finite.positive(),ry:finite.positive()}).refine(hasPoint,'circle 좌표가 필요합니다.'),
 z.object({type:z.literal('underline'),...common,target}),
 z.object({type:z.literal('arrow'),...common,from:z.union([point,target]),to:z.union([point,target]),label:z.string().max(500).optional()}),
 z.object({type:z.literal('bracket'),...common,axis:z.enum(['x','y']),from:finite,to:finite,label:z.string().max(500).optional()}).refine(a=>a.from!==a.to,'구간 길이가 필요합니다.'),
 z.object({type:z.literal('shade'),...common,region:z.string().regex(/^(?:(?:above|below):(?:fn:\d+|axis)|between:fn:\d+,fn:\d+)$/),x:z.tuple([finite,finite]).optional()}),
 z.object({type:z.literal('handwrite'),...common,tex:z.string().max(2000).optional(),text:z.string().max(2000).optional()}).refine(a=>hasPoint(a)&&Boolean(a.tex||a.text),'메모 좌표와 내용이 필요합니다.'),
 z.object({type:z.literal('flash'),...common,target}),
] as const;
export const chalkSchema=z.discriminatedUnion('type',chalkOptions);
export type ChalkAction=z.infer<typeof chalkSchema>;
