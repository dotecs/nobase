import moveStyles from './move.module.css';
import katex from 'katex';
import { useMemo } from 'react';
import { targetKatexOptions } from '@/lib/learn/lessons/items';
import type { StageState } from '@/lib/learn/lessons/stage-state';
import { instructionColor, targetOpacity } from '@/lib/learn/lessons/instruction-style';

/** KaTeX rendered directly so items can use `\\p{part}{…}` (→ data-stage-target spans) — react-katex does not expose trust/macros. */
export function StudioMath({ tex, itemId, target, display = true, state }: { tex: string; itemId?: string; target?: string; display?: boolean; state?: StageState }) {
  const prefix = target ?? (itemId ? 'item:' + itemId : undefined);
  const html = useMemo(() => {
    try {
      return katex.renderToString((display ? '\\displaystyle ' : '') + tex, { displayMode: false, throwOnError: false, strict: 'ignore', ...(prefix ? targetKatexOptions(prefix) : {}) });
    } catch { return tex; }
  }, [tex, prefix, display]);
  // Keep styles in the rendered markup: later target measurements must not erase them.
  const styled = state ? html.replace(/(<span\b[^>]*data-stage-target="([^"]+)"[^>]*)(>)/g, (_match, tag: string, id: string) => {
    const color=instructionColor(state,id);
    const partPrefix=id.split('/')[0]+'/';
    const destination=state.moves?.find(move=>move.to===id);
    const opacity=destination&&!destination.arrived?0:state.highlight?.some(value=>value.startsWith(partPrefix)) ? targetOpacity(state,id) : 1;
    return tag + (destination?' data-move-destination="true" data-move-arrived="'+destination.arrived+'"':'') + ` style="${color?'color:'+color+';':''}${destination?.arrived?'--move-arrival-opacity:'+Math.min(1,destination.arrivalElapsed/160)+';':''}opacity:${opacity}"` + '>';
  }) : html;
  return <span className={moveStyles.targets} dangerouslySetInnerHTML={{ __html: styled }} />;
}
