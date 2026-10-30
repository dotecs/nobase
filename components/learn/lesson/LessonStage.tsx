'use client';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { renderMathMarkdown } from '@/lib/math-markdown';
import { polynomial } from '@/lib/learn/mathcheck/evaluate';
import { parseMath } from '@/lib/learn/mathcheck/parse';
import { Rational } from '@/lib/learn/mathcheck/rational';
import type { Scene,Sentence } from '@/lib/learn/lessons/schema';
import { StandardGraph } from '../StandardGraph';
import { LessonText } from './LessonText';
import styles from './lesson.module.css';
export function LessonStage({scene,cue,onWhy,onTrace,onQuiz}:{scene:Scene;cue?:Sentence['cue'];onWhy:(id:string|undefined)=>void;onTrace:(id:string)=>void;onQuiz:(id:string,correct:boolean)=>void}){
 const {stage}=scene;const [visible,setVisible]=useState(1),[expanded,setExpanded]=useState<number|null>(null),[choice,setChoice]=useState<string|null>(null);
 const root=useRef<HTMLDivElement>(null);const [parameter,setParameter]=useState(stage.type==='slider'?stage.param.init:0);
 useEffect(()=>{const count=stage.type==='steps'?stage.steps.length:stage.type==='chain'?stage.nodes.length:1;if(!root.current||count<=1)return;let timer:ReturnType<typeof setInterval>|undefined;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){timer=setInterval(()=>setVisible(v=>{if(v>=count){clearInterval(timer);return v;}return v+1;}),700);observer.disconnect();}},{threshold:.1});observer.observe(root.current);return()=>{observer.disconnect();clearInterval(timer);};},[]);
 let content;
 if(stage.type==='graph')content=<StandardGraph {...stage} highlight={cue?.highlight}/>;
 else if(stage.type==='steps')content=<ol className={styles.steps}>{stage.steps.map((s,i)=><li key={i} hidden={i>=Math.max(visible,(cue?.step??-1)+1)}><div className={styles.formula}>{renderMathMarkdown('$'+s.tex+'$')}</div>{s.think&&<p className={styles.help}>{s.think}</p>}{(s.why||s.concept_id)&&<button type="button" onClick={()=>{setExpanded(expanded===i?null:i);onWhy(s.concept_id);}}>왜? · 근거 확인</button>}{expanded===i&&<div className={styles.explanation}>{s.why&&<LessonText text={s.why}/>} {s.concept_id&&<><Link href={'/learn/concept/'+s.concept_id}>개념 카드</Link><button type="button" onClick={()=>onTrace(s.concept_id!)}>모르겠어요</button></>}</div>}</li>)}</ol>;
 else if(stage.type==='chain')content=<ol className={styles.chain}>{stage.nodes.map((n,i)=><li key={i} hidden={i>=Math.max(visible,(cue?.node??-1)+1)}>{n.tex&&<div className={styles.formula}>{renderMathMarkdown('$'+n.tex+'$')}</div>}<LessonText text={n.text}/></li>)}</ol>;
 else if(stage.type==='slider'){
  let verdict='';if(stage.verdict==='discriminant')try{const p=polynomial(parseMath(stage.expr).left,{[stage.param.name]:Rational.parse(String(parameter))});const [c,b,a]=p.coefficients.map(v=>Number(v.n)/Number(v.d));if(a){const d=b*b-4*a*c;verdict=`D = ${Number(d.toFixed(6))} · ${Math.abs(d)<1e-8?'중근':d>0?'서로 다른 두 실근':'실근 없음'}`;}}catch{verdict='이 식의 판별식을 표시할 수 없습니다.';}
  content=<><StandardGraph x={stage.x} y={stage.y} fns={[{expr:stage.expr,c:'c1'}]} parameters={{[stage.param.name]:parameter}} aria={scene.title}/><label className={styles.slider}>{stage.param.name} = <output>{parameter}</output><input aria-label={stage.param.name+' 값'} type="range" min={stage.param.min} max={stage.param.max} step={stage.param.step} value={parameter} onChange={e=>setParameter(Number(e.target.value))}/></label>{verdict&&<p role="status">{verdict}</p>}</>;
 }else if(stage.type==='table')content=<div className={styles.table}><table><thead><tr>{stage.columns.map((c,i)=><th key={i} scope="col">{c}</th>)}</tr></thead><tbody>{stage.rows.map((row,i)=><tr key={i} data-tone={row.tone} data-current={cue?.row===i}>{row.cells.map((cell,j)=><td key={j}><LessonText text={cell}/></td>)}</tr>)}</tbody></table></div>;
 else if(stage.type==='quiz')content=<div className={styles.quiz}><LessonText text={stage.stem_md}/>{stage.options.map(o=><button key={o.id} type="button" aria-pressed={choice===o.id} data-correct={choice!==null&&o.id===stage.correct} onClick={()=>{setChoice(o.id);onQuiz(o.id,o.id===stage.correct);}}><LessonText text={o.text_md}/></button>)}{choice&&<div role="status"><strong>{choice===stage.correct?'맞았어요.':'다시 살펴봐요.'}</strong><LessonText text={stage.explain}/></div>}<button type="button" onClick={()=>onTrace(stage.trace_concept_id)}>모르겠어요</button></div>;
 else content=<figure><img className={styles.figure} src={stage.image_path??'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(stage.svg!)} alt={stage.caption}/><figcaption>{stage.caption}</figcaption></figure>;
 return <div ref={root} className={styles.stage}>{content}</div>;
}
