import {it,expect} from 'vitest';
import {formatExact,isExact,formatNum,formulaValues} from './format-num';
it.each([[3,'3','3'],[-3,'−3','−3'],[7/4,'\\tfrac{7}{4}','7/4'],[-7/4,'-\\tfrac{7}{4}','−7/4'],[Math.PI/2,'\\tfrac{\\pi}{2}','π/2'],[-3*Math.PI/4,'-\\tfrac{3\\pi}{4}','−3π/4'],[2*Math.E,'2e','2e'],[Math.E/2,'\\tfrac{e}{2}','e/2'],[Math.sqrt(13),'\\sqrt{13}','√13'],[Math.sqrt(13)/2,'\\tfrac{\\sqrt{13}}{2}','√13/2'],[Math.sqrt(12),'2\\sqrt{3}','2√3'],[Math.sqrt(2/3),'\\tfrac{\\sqrt{6}}{3}','√6/3'],[1.3028,'\\tfrac{3257}{2500}','3257/2500'],[-1.3028,'-\\tfrac{3257}{2500}','−3257/2500']] as const)('formats %s exactly',(value,tex,text)=>{expect(formatExact(value,'tex')).toBe(tex);expect(formatNum(value)).toBe(text);expect(isExact(value)).toBe(true);});
it.each([0,-0,1e-12])('normalizes near-zero %s',value=>expect(formatNum(value)).toBe('0'));
it('absorbs floating-point noise',()=>{expect(formatNum(.3333333333)).toBe('1/3');expect(formatNum(.1+.2)).toBe('3/10');});
it('rejects nonfinite values',()=>{expect(isExact(NaN)).toBe(false);expect(()=>formatNum(Infinity)).toThrow();});
it('keeps sign merging while emitting TeX fractions',()=>{expect(formulaValues('x + {{c}}',{c:-.5})).toBe('x - \\tfrac{1}{2}');});
