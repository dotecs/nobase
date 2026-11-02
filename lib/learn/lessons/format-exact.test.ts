import {it,expect} from 'vitest';
import {formatExact,isExact,formatNum,formulaValues} from './format-num';
it.each([[3,'3','3'],[-3,'−3','−3'],[7/4,'\\dfrac{7}{4}','7/4'],[-7/4,'-\\dfrac{7}{4}','−7/4'],[Math.PI/2,'\\dfrac{\\pi}{2}','π/2'],[-3*Math.PI/4,'-\\dfrac{3\\pi}{4}','−3π/4'],[2*Math.E,'2e','2e'],[Math.E/2,'\\dfrac{e}{2}','e/2'],[Math.sqrt(13),'\\sqrt{13}','√13'],[Math.sqrt(13)/2,'\\dfrac{\\sqrt{13}}{2}','√13/2'],[Math.sqrt(12),'2\\sqrt{3}','2√3'],[Math.sqrt(2/3),'\\dfrac{\\sqrt{6}}{3}','√6/3']] as const)('formats %s exactly',(value,tex,text)=>{expect(formatExact(value,'tex')).toBe(tex);expect(formatNum(value)).toBe(text);expect(isExact(value)).toBe(true);});
it('falls back to two decimals instead of a meaningless big fraction',()=>{expect(formatExact(1.3028,'tex')).toBe('1.3');expect(formatNum(-1.3028)).toBe('−1.3');expect(formatExact(2.070333999999999,'tex')).toBe('2.07');expect(isExact(1.3028)).toBe(false);});
it.each([0,-0,1e-12])('normalizes near-zero %s',value=>expect(formatNum(value)).toBe('0'));
it('absorbs floating-point noise',()=>{expect(formatNum(.3333333333)).toBe('1/3');expect(formatNum(.1+.2)).toBe('3/10');});
it('rejects nonfinite values',()=>{expect(isExact(NaN)).toBe(false);expect(()=>formatNum(Infinity)).toThrow();});
it('keeps sign merging while emitting TeX fractions',()=>{expect(formulaValues('x + {{c}}',{c:-.5})).toBe('x - \\dfrac{1}{2}');});
it('does not mistake scientific-notation integers for algebraic e',()=>expect(formatNum(1e21)).toBe('1000000000000000000000'));
