import type { GraphStage } from '@/lib/learn/lessons/schema';
import { GRAPH,graphScale,curvePath,integerTicks } from '@/lib/learn/lessons/graph';
import styles from './graph.module.css';
const colors={c1:'var(--color-primary)',c2:'var(--color-secondary-500)',c3:'var(--color-warning)'};
export type StandardGraphProps=Omit<GraphStage,'type'>&{highlight?:string;parameters?:Record<string,number>};
export function StandardGraph({x,y,fns,points=[],band,aria,highlight,parameters}:StandardGraphProps){
 const {sx,sy}=graphScale(x,y),right=GRAPH.width-GRAPH.right,bottom=GRAPH.height-GRAPH.bottom;
 const hasX=y[0]<=0&&y[1]>=0,hasY=x[0]<=0&&x[1]>=0;
 const active=(key:string,label?:string)=>!highlight||highlight===key||highlight===label;
 return <figure className={styles.figure}><svg className={styles.graph} viewBox="0 0 640 400" role="img" aria-label={aria}>
  {band&&<rect className={styles.band} x={GRAPH.left} y={sy(Math.min(y[1],Math.max(...band)))} width={right-GRAPH.left} height={Math.max(0,sy(Math.max(y[0],Math.min(...band)))-sy(Math.min(y[1],Math.max(...band))))}/>}
  <g className={styles.grid}>{integerTicks(x).map(t=><line key={'x'+t} x1={sx(t)} x2={sx(t)} y1={GRAPH.top} y2={bottom}/>)}{integerTicks(y).map(t=><line key={'y'+t} y1={sy(t)} y2={sy(t)} x1={GRAPH.left} x2={right}/>)}</g>
  <g className={styles.axes}>{hasX&&<><line x1={GRAPH.left} x2={right} y1={sy(0)} y2={sy(0)}/><polygon points={`${right},${sy(0)} ${right-9},${sy(0)-4} ${right-9},${sy(0)+4}`}/><text x={right-8} y={sy(0)-10}>x</text></>}{hasY&&<><line x1={sx(0)} x2={sx(0)} y1={bottom} y2={GRAPH.top}/><polygon points={`${sx(0)},${GRAPH.top} ${sx(0)-4},${GRAPH.top+9} ${sx(0)+4},${GRAPH.top+9}`}/><text x={sx(0)+10} y={GRAPH.top+8}>y</text></>}
  {hasX&&hasY&&<text x={sx(0)-15} y={sy(0)+17}>O</text>}
  {hasX&&integerTicks(x).filter(t=>t!==0).map(t=><text className={styles.tick} key={'x'+t} x={sx(t)} y={sy(0)+17} textAnchor="middle">{t}</text>)}
  {hasY&&integerTicks(y).filter(t=>t!==0).map(t=><text className={styles.tick} key={'y'+t} x={sx(0)-7} y={sy(t)+4} textAnchor="end">{t}</text>)}
  </g>
  {fns.map((fn,i)=><path key={i} d={curvePath(fn.expr,x,y,parameters)} className={styles.curve} stroke={colors[fn.c]} opacity={active('fn:'+i,fn.label)||highlight===fn.c?1:.25}/>)}
  {points.filter(p=>p.x>=x[0]&&p.x<=x[1]&&p.y>=y[0]&&p.y<=y[1]).map((p,i)=><g key={i} fill={colors[p.c]} opacity={active('point:'+i,p.label)?1:.25}><circle cx={sx(p.x)} cy={sy(p.y)} r={5}/>{p.label&&<text x={sx(p.x)+8} y={sy(p.y)-8}>{p.label}</text>}</g>)}
 </svg>{fns.some(f=>f.label)&&<figcaption className={styles.legend}>{fns.map((fn,i)=>fn.label&&<span key={i}><i style={{background:colors[fn.c]}}/>{fn.label}</span>)}</figcaption>}</figure>;
}
