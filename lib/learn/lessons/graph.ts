import { parseMath } from '../mathcheck/parse';
import { numeric } from '../mathcheck/evaluate';
export const GRAPH={width:640,height:400,left:36,right:16,top:14,bottom:28,samples:400} as const;
export type GraphViewport={width:number;height:number;left:number;right:number;top:number;bottom:number};
export function graphScale(x:[number,number],y:[number,number],viewport:GraphViewport=GRAPH){
 return {sx:(value:number)=>viewport.left+(value-x[0])/(x[1]-x[0])*(viewport.width-viewport.left-viewport.right),sy:(value:number)=>viewport.top+(y[1]-value)/(y[1]-y[0])*(viewport.height-viewport.top-viewport.bottom)};
}
export function curvePath(expr:string,x:[number,number],y:[number,number],parameters:Record<string,number>={},viewport:GraphViewport=GRAPH){
 const ast=parseMath(expr);if(ast.relation)throw new Error('Graph must be an expression');
 const {sx,sy}=graphScale(x,y,viewport);let path='',pen=false;
 for(let i=0;i<GRAPH.samples;i++){const px=x[0]+(x[1]-x[0])*i/(GRAPH.samples-1);const py=numeric(ast.left,{...parameters,x:px});
  if(!Number.isFinite(py)||py<y[0]||py>y[1]){pen=false;continue;}
  path+=`${pen?'L':'M'}${sx(px).toFixed(2)},${sy(py).toFixed(2)} `;pen=true;
 }
 return path.trim();
}
export function integerTicks([low,high]:[number,number]){return Array.from({length:Math.max(0,Math.min(201,Math.floor(high)-Math.ceil(low)+1))},(_,i)=>Math.ceil(low)+i);}
