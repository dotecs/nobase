import { InlineMath,BlockMath } from 'react-katex';
import { inspectMath } from '@/lib/learn/mathcheck/format';
/** Read-only authored captions; student input still uses the existing MathPreview. */
export function LessonText({text,authored=false}:{text:string;authored?:boolean}){return <>{text.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g).map((part,i)=>{if(!part.startsWith('$'))return part;const block=part.startsWith('$$'),raw=part.slice(block?2:1,block?-2:-1),parsed=authored?null:inspectMath(raw),latex=parsed?.status==='success'?parsed.latex:raw;return block?<BlockMath key={i} math={latex}/>:<span key={i} data-lesson-math={parsed?.status==='success'?'ast':'authored'}><InlineMath math={latex}/></span>;})}</>;}
