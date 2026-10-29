import { formatMath } from '@/lib/learn/mathcheck/format';
import { renderMathMarkdown } from '@/lib/math-markdown';
/** Server-rendered display uses exactly the same AST formatter as the input preview. */
export function FormattedMath({value}:{value:string}) {
 const result=formatMath(value);
 return <span title={value}>{'latex' in result?renderMathMarkdown('$'+result.latex+'$'):<code>{result.raw}</code>}</span>;
}
