import { LessonText } from '@/components/learn/lesson/LessonText';
import { StudioMath } from './StudioMath';
import type { StageState } from '@/lib/learn/lessons/stage-state';

/** A cell shares its part namespace across all inline math spans. */
export function StudioText({text,target,state}:{text:string;target:string;state?:StageState}) {
  return <>{text.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g).map((part,i) => {
    if (!part.startsWith('$')) return <LessonText key={i} authored text={part}/>;
    const block = part.startsWith('$$');
    return <span key={i} style={block ? {display:'block'} : undefined}><StudioMath tex={part.slice(block?2:1,block?-2:-1)} target={target} state={state}/></span>;
  })}</>;
}
