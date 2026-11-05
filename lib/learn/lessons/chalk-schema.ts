import {positionSchema} from './position';
import {coordinate} from './coordinate';
import {z} from 'zod';
const finite=z.number().finite(),point=z.object({x:coordinate,y:coordinate}),target=z.string().min(1).max(160);
const common={position:positionSchema.optional(),at:z.union([finite.nonnegative(),z.string().regex(/^@.+$/),point]).optional(),at_ms:finite.nonnegative().optional(),ttl_ms:finite.nonnegative().optional(),until:z.enum(['sentence','scene']).optional(),color:z.enum(['mark','hand','chalk','accent']).optional()};
const hasPoint=(a:{at?:unknown;position?:unknown})=>!!a.position||(typeof a.at==='object'&&a.at!==null);
export const chalkOptions=[
 z.object({type:z.literal('strike'),...common,target:target.optional(),targets:z.array(target).min(1).optional(),pairs:z.array(z.tuple([target,target])).min(1).optional(),stagger_ms:finite.nonnegative().optional(),direction:z.enum(['/','\\']).optional()}).refine(a=>[a.target,a.targets,a.pairs].filter(Boolean).length===1,'strike에는 target, targets, pairs 중 하나를 지정하세요.'),
 z.object({type:z.literal('pointer'),...common,target:target.optional()}).refine(a=>hasPoint(a)||!!a.target,'pointer 좌표 또는 대상이 필요합니다.'),
 z.object({type:z.literal('circle'),...common,target:target.optional(),rx:coordinate.pipe(z.number().positive()).optional(),ry:coordinate.pipe(z.number().positive()).optional()}).refine(a=>!!a.target||(hasPoint(a)&&a.rx!==undefined&&a.ry!==undefined),'circle에는 대상 또는 좌표와 반지름이 필요합니다.'),
 z.object({type:z.literal('underline'),...common,target,from:point.optional(),to:point.optional()}),
 z.object({type:z.literal('arrow'),...common,from:z.union([point,target]),to:z.union([point,target]),label:z.string().max(500).optional()}),
 z.object({type:z.literal('bracket'),...common,axis:z.enum(['x','y']),label_pos:z.enum(['above','below']).optional(),from:coordinate,to:coordinate,label:z.string().max(500).optional()}).refine(a=>a.from!==a.to,'구간 길이가 필요합니다.'),
 z.object({type:z.literal('shade'),...common,region:z.string().regex(/^(?:(?:above|below):(?:fn:\d+|axis)|between:fn:\d+,fn:\d+)$/),x:z.tuple([finite,finite]).optional()}),
 z.object({type:z.literal('handwrite'),...common,arrow_to:z.union([point,z.object({target,anchor:z.enum(['edge','center','top','bottom','left','right']).optional()})]).optional(),rotate:finite.min(-15).max(15).optional(),align:z.enum(['start','middle']).optional(),tex:z.string().max(2000).optional(),text:z.string().max(2000).optional()}).refine(a=>hasPoint(a)&&Boolean(a.tex||a.text),'메모 좌표와 내용이 필요합니다.'),
 z.object({type:z.literal('flash'),...common,target}),
] as const;
export const chalkSchema=z.discriminatedUnion('type',chalkOptions);
export type ChalkAction=z.infer<typeof chalkSchema>;
