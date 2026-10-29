'use client';
import { useEffect,useMemo,useState } from 'react';
import { inspectMath } from '@/lib/learn/mathcheck/format';
import { renderMathMarkdown } from '@/lib/math-markdown';
import styles from './math-preview.module.css';
export function MathPreview({value,empty='입력한 답이 여기에 표시됩니다.',caption=true,help=true,successOnly=false}:{value:string;empty?:string;caption?:boolean;help?:boolean;successOnly?:boolean}) {
 const current=useMemo(()=>inspectMath(value),[value]);
 const [last,setLast]=useState<string|null>(current.status==='success'?current.latex:null);
 useEffect(()=>{if(current.status==='success')setLast(current.latex);},[current]);
 if(successOnly&&current.status!=='success')return null;
 const latex=current.status==='success'?current.latex:value.trim()?last:null;
 return <div className={styles.preview} aria-label="입력 미리보기" title={value}>
  {current.status==='unsupported'&&!successOnly?<p role="status" aria-live="polite">아직 지원하지 않는 기호예요: {current.symbol}</p>:caption&&<span>보이는 식: </span>}
  {!value.trim()?<span>{empty}</span>:<>{latex&&<span className={current.status==='success'?undefined:styles.stale}>{renderMathMarkdown('$'+latex+'$')}</span>}{current.status!=='success'&&<code className={styles.raw}>{value}</code>}</>}
  {help&&!successOnly&&<details><summary>입력 도움말</summary><ul>{['5/6','x^2','sqrt(2) 또는 √2','2pi','log(2,8)','sin(30°)','|x-1|','x<=-7'].map(example=><li key={example}><code>{example}</code></li>)}</ul><p>함수 괄호 안에 식을 적어 주세요. 삼각함수는 라디안이며, 도 단위에는 °를 붙여 주세요.</p></details>}
 </div>;
}
