import { MathPreview } from '../MathPreview';
import { renderMathMarkdown } from '@/lib/math-markdown';
import { inspectMath } from '@/lib/learn/mathcheck/format';

export function LessonText({text,authored=false}:{text:string;authored?:boolean}) {
  if(authored)return <>{renderMathMarkdown(text)}</>;
  return <>{text.split(/(\$\$?[\s\S]*?\$\$?)/g).map((part,i)=>{
    if(!part.startsWith('$'))return part;
    const math=part.replace(/^\$\$?|\$\$?$/g,'');
    // Only read-only lesson captions may fall back to authored TeX.
    return inspectMath(math).status==='success'
      ? <MathPreview key={i} value={math} caption={false} help={false}/>
      : <span key={i}>{renderMathMarkdown(part)}</span>;
  })}</>;
}
