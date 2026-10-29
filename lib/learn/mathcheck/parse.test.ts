import { describe,it,expect } from 'vitest';
import { parseMath,normalizeMath,UnsupportedError,type Expr } from './parse';
function shape(e:Expr):string {if(e.kind==='number')return e.value.toString();if(e.kind==='variable'||e.kind==='constant')return e.name;if(e.kind==='neg')return `(-${shape(e.value)})`;if(e.kind==='call')return `${e.fn}(${e.args.map(shape).join(',')})`;return `(${shape(e.left)}${e.op}${shape(e.right)})`;}
describe('math input v2 parser',()=>{
 it.each([['-12x+21','(((-12)*x)+21)'],['1/2x','((1/2)*x)'],['(-3)+7-(-5)','(((-3)+7)-(-5))'],['-x^2','(-(x^2))'],['2^3^2','(2^(3^2))'],['1/2/3/4','(((1/2)/3)/4)']])('keeps prior AST: %s',(input,expected)=>expect(shape(parseMath(input).left)).toBe(expected));
 it('keeps the existing inequality AST',()=>{const p=parseMath('x<=-7');expect([shape(p.left),p.relation,shape(p.right!)]).toEqual(['x','<=','(-7)']);});
 it.each([['sqrt2x','(sqrt(2)*x)'],['sin 2x','(sin(2)*x)'],['sinx','sin(x)'],['pix','(pi*x)'],['xy','(x*y)'],['sqrt(x)^2','(sqrt(x)^2)'],['|x|+|y|','(abs(x)+abs(y))'],['30°','((30*pi)/180)'],['sin(30°)','sin(((30*pi)/180))'],['√2','sqrt(2)'],['π','pi'],['x²+x³','((x^2)+(x^3))']])('parses %s',(input,expected)=>expect(shape(parseMath(input).left)).toBe(expected));
 it.each([['\\sqrt[3]{8}','root(3,8)'],['\\sqrt{x+1}','sqrt((x+1))'],['\\log_{2} 8','log(2,8)'],['\\log_2 8','log(2,8)'],['\\log x','log(x)'],['\\ln(2)','ln(2)'],['\\left|x\\right|','abs(x)'],['30^{\\circ}','((30*pi)/180)'],['\\frac{1}{\\sqrt{2}}','(1/sqrt(2))']])('normalizes LaTeX %s',(input,expected)=>expect(shape(parseMath(input).left)).toBe(expected));
 it.each(['||x|-1|','sqrt('+ '('.repeat(41)+'x'+')'.repeat(41)+')'])('rejects excessive nesting %s',input=>expect(()=>parseMath(input)).toThrow(UnsupportedError));
 it.each(['∫','∑','Σ','lim','→','\\foo'])('reports unsupported symbol %s',symbol=>expect(()=>parseMath(symbol+'x')).toThrow('Unsupported notation: '+(symbol==='\\foo'?'\\foox':symbol)));
 it('retains decimal source text',()=>{expect(parseMath('0.50').left).toMatchObject({kind:'number',raw:'0.50'});expect(normalizeMath('−3×2÷4')).toBe('-3*2/4');});
});
