import { MathPreview } from '../MathPreview';
export function LessonText({text}:{text:string}){return <>{text.split(/(\$\$?[\s\S]*?\$\$?)/g).map((part,i)=>part.startsWith('$')?<MathPreview key={i} value={part.replace(/^\$\$?|\$\$?$/g,'')} caption={false} help={false}/>:part)}</>;}
