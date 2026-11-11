import { LessonText } from '@/components/learn/lesson/LessonText';
import { StudioMath } from './StudioMath';
import type { StageState } from '@/lib/learn/lessons/stage-state';

/** A cell shares its part namespace across all inline math spans. */
export function StudioText({text,target,state}:{text:string;target:string;state?:StageState}) {
  // **굵게** 가 $수식$ 을 감싸도 깨지지 않도록 굵게 구간을 먼저 나눈 뒤 수식을 나눈다.
  return <>{text.split(/(\*\*[\s\S]+?\*\*)/g).map((seg,j) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) return <strong key={j}><Inline text={seg.slice(2,-2)} target={target} state={state}/></strong>;
    return <Inline key={j} text={seg} target={target} state={state}/>;
  })}</>;
}

function Inline({text,target,state}:{text:string;target:string;state?:StageState}) {
  return <>{text.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g).map((part,i) => {
    if (!part.startsWith('$')) return <LessonText key={i} authored text={part}/>;
    const block = part.startsWith('$$');
    return <span key={i} style={block ? {display:'block'} : undefined}><StudioMath tex={part.slice(block?2:1,block?-2:-1)} target={target} state={state}/></span>;
  })}</>;
}
