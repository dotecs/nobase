import { MathPreview } from '../MathPreview';
import { renderMathMarkdown } from '@/lib/math-markdown';
export function LessonText({text,authored=false}:{text:string;authored?:boolean}){if(authored)return <>{renderMathMarkdown(text)}</>;return <>{text.split(/(\$\$?[\s\S]*?\$\$?)/g).map((part,i)=>part.startsWith('$')?<MathPreview key={i} value={part.replace(/^\$\$?|\$\$?$/g,'')} caption={false} help={false}/>:part)}</>;}
