import {z} from 'zod';
import {parseMath,type Expr} from '../mathcheck/parse';
import {numeric} from '../mathcheck/evaluate';
import {inspectMath} from '../mathcheck/format';
function allowed(e:Expr):boolean{switch(e.kind){case 'number':case 'constant':return true;case 'variable':return e.name==='e';case 'neg':return allowed(e.value);case 'call':return e.fn==='sqrt'&&e.args.length===1&&allowed(e.args[0]);case 'binary':return e.op!=='^'&&allowed(e.left)&&allowed(e.right);}}
export function expressionNumber(source:string){const p=parseMath(source);if(p.relation||!allowed(p.left))throw new Error('좌표에는 변수 없는 상수식만 사용할 수 있습니다.');const n=numeric(p.left,{e:Math.E});if(!Number.isFinite(n))throw new Error('좌표는 유한한 수여야 합니다.');return n;}
const finite=z.number().finite(),exprString=z.string().min(1).max(500).refine(s=>{try{expressionNumber(s);return true;}catch{return false;}},'상수식을 해석할 수 없습니다.'),input=z.union([finite,exprString]);
export const coordinate=z.preprocess(value=>{const parsed=input.safeParse(value);return parsed.success&&typeof parsed.data==='string'?expressionNumber(parsed.data):value;},finite);
export function coordinateTex(value:unknown){if(typeof value!=='string')return undefined;const parsed=inspectMath(value);return parsed.status==='success'?parsed.latex:undefined;}
export function pointTex(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))return value;const p=value as Record<string,unknown>;return {...p,...(typeof p.x==='string'?{x_tex:coordinateTex(p.x)}:{}),...(typeof p.y==='string'?{y_tex:coordinateTex(p.y)}:{})};}
export const graphPoint=z.preprocess(pointTex,z.object({x:coordinate,y:coordinate,x_tex:z.string().max(2000).optional(),y_tex:z.string().max(2000).optional(),c:z.enum(['c1','c2','c3']),guides:z.boolean().optional(),label_pos:z.enum(['ne','nw','se','sw']).optional(),label:z.string().min(1).max(20000).optional()}));
