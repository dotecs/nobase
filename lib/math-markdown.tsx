import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

type MathMarkdownOptions = {
  onError?: 'message' | 'raw';
  blockClassName?: string;
  errorClassName?: string;
};

export function renderMathMarkdown(text: string, opts: MathMarkdownOptions = {}): React.ReactNode[] {
  const { onError = 'raw', blockClassName, errorClassName } = opts;
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const inline = (value: string, startKey: number): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    let rest = value;
    let index = startKey;
    while (rest.includes('$')) {
      const start = rest.indexOf('$');
      const end = rest.indexOf('$', start + 1);
      if (end === -1) {
        nodes.push(<span key={`text-${index++}`}>{rest}</span>);
        return nodes;
      }
      if (start > 0) nodes.push(<span key={`text-${index++}`}>{rest.slice(0, start)}</span>);
      const math = rest.slice(start + 1, end);
      nodes.push(<InlineMath key={`inline-${index++}`} math={math} renderError={() =>
        onError === 'message'
          ? <span className={errorClassName}>수식 오류</span>
          : <span>{`$${math}$`}</span>
      } />);
      rest = rest.slice(end + 1);
    }
    if (rest) nodes.push(<span key={`text-${index++}`}>{rest}</span>);
    return nodes;
  };

  while (remaining.includes('$$')) {
    const start = remaining.indexOf('$$');
    const end = remaining.indexOf('$$', start + 2);
    if (end === -1) break;
    if (start > 0) {
      parts.push(...inline(remaining.slice(0, start), key));
      key += 100;
    }
    const math = remaining.slice(start + 2, end);
    parts.push(<div key={`block-${key++}`} className={blockClassName}>
      <BlockMath math={math} renderError={() => onError === 'message'
        ? <div className={errorClassName}>수식 오류: {math}</div>
        : <span>{`$$${math}$$`}</span>
      } />
    </div>);
    remaining = remaining.slice(end + 2);
  }
  if (remaining) parts.push(...inline(remaining, key));
  return parts;
}
