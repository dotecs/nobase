import { InlineMath,BlockMath } from 'react-katex';
import { inspectMath } from '@/lib/learn/mathcheck/format';
/** Read-only authored captions; student input still uses the existing MathPreview. */
export function LessonText({text,authored=false}:{text:string;authored?:boolean}){
  // 작성 문구는 **굵게** 구간을 먼저 나눠, 굵게 안에 $수식$ 이 있어도 별표가 그대로 보이지 않게 한다.
  if(authored)return <>{text.split(/(\*\*[\s\S]+?\*\*)/g).map((seg,j)=>seg.length>4&&seg.startsWith('**')&&seg.endsWith('**')?<strong key={j}><Segments text={seg.slice(2,-2)} authored/></strong>:<Segments key={j} text={seg} authored/>)}</>;
  return <Segments text={text} authored={false}/>;
}
function Segments({text,authored}:{text:string;authored:boolean}){return <>{text.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g).map((part,i)=>{if(!part.startsWith('$'))return part;const block=part.startsWith('$$'),raw=part.slice(block?2:1,block?-2:-1),parsed=authored?null:inspectMath(raw),latex=(parsed?.status==='success'?parsed.latex:raw),shown=authored&&!block?'\\displaystyle '+latex:latex;return block?<BlockMath key={i} math={latex}/>:<span key={i} data-lesson-math={parsed?.status==='success'?'ast':'authored'}><InlineMath math={shown}/></span>;})}</>;}
