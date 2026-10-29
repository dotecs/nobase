import { describe,it,expect } from 'vitest';
import { parseMath } from './parse';
import { toAscii,toLatex } from './latex';
const examples=['1/2x','(1/2)x','x^2/3','2^(1/2)','-(x-1)','3*4','x<=-7','0.50','-x^2','2^3^2','sqrt(12)','root(3,8)','log(2,8)','ln(exp(2))','sin(x)^2+cos(x)^2','sin(30°)','abs(-3)','|x-1|','2pi','pix','sqrt2x','sin 2x','x/(x+1)','a-(-b)','a+(b-c)','2*(3*x)','(x+1)(x-1)','x>=sqrt(2)','30°','1/2/3/4','-12x+21','(-3)+7-(-5)','x²','π/4'];
describe('AST renderers',()=>{
 it.each(examples)('ASCII round trip preserves the entire AST: %s',input=>{const parsed=parseMath(input);expect(parseMath(toAscii(parsed))).toEqual(parsed);});
 it.each([['1/2x','\\frac{1}{2}x'],['(1/2)x','\\frac{1}{2}x'],['x<=-7','x \\le -7'],['0.50','0.50'],['3*4','3\\times 4'],['log(2,8)','\\log_{2} 8'],['30°','30^{\\circ}'],['exp(x)','e^{x}']])('LaTeX %s',(input,expected)=>expect(toLatex(parseMath(input))).toBe(expected));
 it('delimits function application before multiplication and powers',()=>{expect(toLatex(parseMath('sin 2x'))).toBe('\\left(\\sin 2\\right)x');expect(toLatex(parseMath('sin(x)^2'))).toBe('{\\left(\\sin x\\right)}^{2}');});
 it('keeps unary and power grouping visible',()=>{expect(toLatex(parseMath('(-x)^2'))).toBe('{\\left(-x\\right)}^{2}');expect(toLatex(parseMath('-(x-1)'))).toBe('-\\left(x-1\\right)');});
});
