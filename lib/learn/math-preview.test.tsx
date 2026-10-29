import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathPreview } from '@/components/learn/MathPreview';
import { formatMath,inspectMath } from './mathcheck/format';
describe('shared math preview',()=>{
 it('renders the parser interpretation rather than treating slash text as LaTeX',()=>{const html=renderToStaticMarkup(<MathPreview value="1/2x"/>);expect(html).toContain('mfrac');expect(html).toContain('\\frac{1}{2}x');expect(html).not.toContain('aria-live');expect(formatMath('1/2x')).toEqual({latex:'\\frac{1}{2}x'});});
 it('reports unsupported symbols before submission',()=>{const html=renderToStaticMarkup(<MathPreview value="∫x"/>);expect(html).toContain('아직 지원하지 않는 기호예요:');expect(html).toContain('role="status"');expect(html).toContain('aria-live="polite"');expect(inspectMath('∫x')).toMatchObject({status:'unsupported',symbol:'∫'});});
 it.each(['5/','sqrt(','x<='])('incomplete input %s remains raw',value=>{const html=renderToStaticMarkup(<MathPreview value={value}/>);expect(html).toContain('<code');expect(html).not.toContain('katex');expect(formatMath(value)).toEqual({raw:value});});
 it('shows empty guidance and collapsible examples',()=>{const html=renderToStaticMarkup(<MathPreview value=""/>);expect(html).toContain('입력한 답이 여기에 표시됩니다.');expect(html).toContain('<details>');expect(html).toContain('입력 도움말');});
 it('compact step preview hides incomplete lines',()=>{expect(renderToStaticMarkup(<MathPreview value="5/" successOnly caption={false}/>)).toBe('');const html=renderToStaticMarkup(<MathPreview value="sqrt(2)" successOnly caption={false}/>);expect(html).toContain('katex');expect(html).not.toContain('보이는 식:');expect(html).not.toContain('<details>');});
});
