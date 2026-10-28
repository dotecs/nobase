import { type Polynomial, formatPolynomial, polynomial } from './evaluate';
import { type Expr } from './parse';
import { Rational } from './rational';

export function commonFactor(p: Polynomial) {
  if (!p.variable || p.coefficients.length !== 2 || p.coefficients.some(c => c.d !== BigInt(1) || c.n === BigInt(0))) return null;
  const [b,a]=p.coefficients;
  let x=a.n < BigInt(0)?-a.n:a.n, y=b.n < BigInt(0)?-b.n:b.n;
  while(y!==BigInt(0)) [x,y]=[y,x%y];
  if(x<BigInt(2))return null;
  const factor=new Rational(x);
  return {factor:x,value:`${x}(${formatPolynomial({...p,coefficients:p.coefficients.map(c=>c.div(factor))})})`};
}
export function hasFactoredProduct(expr:Expr):boolean {
  if(expr.kind==='neg')return hasFactoredProduct(expr.value);
  if(expr.kind!=='binary'||expr.op!=='*')return false;
  const a=polynomial(expr.left),b=polynomial(expr.right);
  const nonunit=(p:Polynomial)=>p.coefficients.length===1&&p.coefficients[0].d===BigInt(1)&&(p.coefficients[0].n>=BigInt(2)||p.coefficients[0].n<=BigInt(-2));
  return nonunit(a)&&b.coefficients.length===2||nonunit(b)&&a.coefficients.length===2;
}
