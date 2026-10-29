import type { Expr,Parsed } from './parse';
const isSum=(e:Expr)=>e.kind==='binary'&&(e.op==='+'||e.op==='-');
const looseCall=(e:Expr)=>e.kind==='call'&&!['sqrt','root','abs'].includes(e.fn);
const parens=(s:string)=>`\\left(${s}\\right)`;
const raw=(e:Extract<Expr,{kind:'number'}>)=>e.raw??e.value.toString();
function ascii(e:Expr):string {
 if(e.kind==='number')return raw(e);
 if(e.kind==='variable'||e.kind==='constant')return e.name;
 if(e.kind==='neg')return `(-${ascii(e.value)})`;
 if(e.kind==='call')return `${e.fn}(${e.args.map(ascii).join(',')})`;
 return `(${ascii(e.left)}${e.op}${ascii(e.right)})`;
}
export function toAscii(p:Parsed):string {return ascii(p.left)+(p.relation&&p.right?p.relation+ascii(p.right):'');}
function numberLeading(e:Expr):boolean {return e.kind==='number'||e.kind==='binary'&&(e.op==='*'||e.op==='^')&&numberLeading(e.left);}
function degree(e:Expr):Expr|null {
 return e.kind==='binary'&&e.op==='/'&&e.right.kind==='number'&&raw(e.right)==='180'&&e.left.kind==='binary'&&e.left.op==='*'&&e.left.right.kind==='constant'?e.left.left:null;
}
function latex(e:Expr):string {
 if(e.kind==='number')return raw(e);
 if(e.kind==='variable')return e.name;
 if(e.kind==='constant')return '\\pi';
 if(e.kind==='neg'){const inner=latex(e.value);return '-'+(isSum(e.value)||e.value.kind==='neg'?parens(inner):inner);}
 if(e.kind==='call'){
  const [a,b]=e.args;
  const arg=(x:Expr)=>x.kind==='binary'||x.kind==='neg'?parens(latex(x)):' '+latex(x);
  if(e.fn==='sqrt')return `\\sqrt{${latex(a)}}`;
  if(e.fn==='root')return `\\sqrt[${latex(a)}]{${latex(b)}}`;
  if(e.fn==='abs')return `\\left|${latex(a)}\\right|`;
  if(e.fn==='exp')return `e^{${latex(a)}}`;
  if(e.fn==='log'&&b)return `\\log_{${latex(a)}}${arg(b)}`;
  return `\\${e.fn}${arg(a)}`;
 }
 const angle=degree(e);if(angle)return `${angle.kind==='binary'||angle.kind==='neg'?parens(latex(angle)):latex(angle)}^{\\circ}`;
 const a=latex(e.left),b=latex(e.right);
 if(e.op==='/')return `\\frac{${a}}{${b}}`;
 if(e.op==='^')return `{${e.left.kind==='binary'||e.left.kind==='neg'||looseCall(e.left)?parens(a):a}}^{${b}}`;
 if(e.op==='*'){
  const left=isSum(e.left)||looseCall(e.left)?parens(a):a,right=isSum(e.right)||e.right.kind==='neg'?parens(b):b;
  // A control word also needs separation before an adjacent variable (pi*x).
  const separator=numberLeading(e.right)?'\\times ':e.left.kind==='constant'?' ':'';
  return left+separator+right;
 }
 const left=e.left.kind==='neg'?parens(a):a,right=isSum(e.right)||e.right.kind==='neg'?parens(b):b;
 return left+e.op+right;
}
export function toLatex(p:Parsed):string {
 const relation={'=':'=','<':'<','<=':'\\le','>':'>','>=':'\\ge'};
 return latex(p.left)+(p.relation&&p.right?` ${relation[p.relation]} ${latex(p.right)}`:'');
}
