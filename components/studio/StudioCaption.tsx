import { renderMathMarkdown } from '@/lib/math-markdown';
import type { Sentence } from '@/lib/learn/lessons/schema';
import styles from './player.module.css';
export function StudioCaption({sentence,worked=false}:{sentence:Sentence;worked?:boolean}){return <div className={styles.caption} title={sentence.text.replace(/\*\*/g,'')}>
 {worked&&sentence.role!=='say'&&<span className={styles.role}>{sentence.role==='think'?'머릿속':'종이에'}</span>}
 <span>{sentence.text.split(/(\*\*[\s\S]*?\*\*)/g).map((part,i)=>part.startsWith('**')?<strong key={i}>{renderMathMarkdown(part.slice(2,-2).replace(/\$\$/g,'$'))}</strong>:<span key={i}>{renderMathMarkdown(part.replace(/\$\$/g,'$'))}</span>)}</span>
 </div>;}
