import katex from 'katex';
import { useMemo } from 'react';
import { itemKatexOptions } from '@/lib/learn/lessons/items';

/** KaTeX rendered directly so items can use `\\p{part}{…}` (→ data-stage-target spans) — react-katex does not expose trust/macros. */
export function StudioMath({ tex, itemId, display = true }: { tex: string; itemId?: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString((display ? '\\displaystyle ' : '') + tex, { displayMode: false, throwOnError: false, strict: 'ignore', ...(itemId ? itemKatexOptions(itemId) : {}) });
    } catch { return tex; }
  }, [tex, itemId, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
