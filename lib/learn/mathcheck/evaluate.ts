import { Rational } from './rational';
import { UnsupportedError, type Expr, type Parsed, type Relation } from './parse';

export type Polynomial = { variable?: string; coefficients: Rational[] };
const zero = () => new Rational(0);
function trim(p: Polynomial): Polynomial { while (p.coefficients.length > 1 && p.coefficients.at(-1)!.n === BigInt(0)) p.coefficients.pop(); return p; }
function combine(a: Polynomial, b: Polynomial, multiply = false): Polynomial {
  if (a.variable && b.variable && a.variable !== b.variable) throw new UnsupportedError('Only one variable is supported');
  const coefficients = Array.from({ length: multiply ? a.coefficients.length + b.coefficients.length - 1 : Math.max(a.coefficients.length, b.coefficients.length) }, zero);
  if (multiply) a.coefficients.forEach((x, i) => b.coefficients.forEach((y, j) => { coefficients[i + j] = coefficients[i + j].add(x.mul(y)); }));
  else coefficients.forEach((_, i) => { coefficients[i] = (a.coefficients[i] ?? zero()).add(b.coefficients[i] ?? zero()); });
  const result = trim({ variable: a.variable ?? b.variable, coefficients });
  if (result.coefficients.length > 3) throw new UnsupportedError('Degree greater than two');
  return result;
}
export function polynomial(expr: Expr, values: Record<string, Rational> = {}): Polynomial {
  if (expr.kind === 'number') return { coefficients: [expr.value] };
  if (expr.kind === 'variable') return values[expr.name] ? { coefficients: [values[expr.name]] } : { variable: expr.name, coefficients: [zero(), new Rational(1)] };
  if (expr.kind === 'neg') { const p = polynomial(expr.value, values); return { ...p, coefficients: p.coefficients.map(value => value.neg()) }; }
  if (expr.kind === 'call' || expr.kind === 'constant') throw new UnsupportedError('Functions and constants require numeric evaluation');
  const a = polynomial(expr.left, values), b = polynomial(expr.right, values);
  if (expr.op === '+') return combine(a, b);
  if (expr.op === '-') return combine(a, { ...b, coefficients: b.coefficients.map(value => value.neg()) });
  if (expr.op === '*') return combine(a, b, true);
  if (expr.op === '/') {
    if (b.coefficients.length !== 1) throw new UnsupportedError('Variable denominator');
    return { ...a, coefficients: a.coefficients.map(value => value.div(b.coefficients[0])) };
  }
  if (b.coefficients.length !== 1 || b.coefficients[0].d !== BigInt(1)) throw new UnsupportedError('Noninteger exponent');
  const exponent = Number(b.coefficients[0].n);
  if (exponent < 0 || exponent > 2) throw new UnsupportedError('Unsupported exponent');
  return exponent === 0 ? { coefficients: [new Rational(1)] } : exponent === 1 ? a : combine(a, a, true);
}
export function evaluate(expr: Expr, values: Record<string, Rational> = {}) {
  const p = polynomial(expr, values);
  if (p.coefficients.length !== 1) throw new UnsupportedError('Unbound variable');
  return p.coefficients[0];
}
function exactEquivalent(a: Expr, b: Expr) {
  const diff = combine(polynomial(a), { ...polynomial(b), coefficients: polynomial(b).coefficients.map(value => value.neg()) });
  return diff.coefficients.every(value => value.n === BigInt(0));
}
export function formatPolynomial(p: Polynomial) {
  const terms = p.coefficients.map((coefficient, degree) => {
    if (coefficient.n === BigInt(0)) return '';
    const suffix = degree ? `${p.variable}${degree === 2 ? '^2' : ''}` : '';
    const value = degree && coefficient.d === BigInt(1) && (coefficient.n === BigInt(1) || coefficient.n === BigInt(-1))
      ? coefficient.n < BigInt(0) ? '-' : '' : coefficient.toString();
    return `${value}${suffix}`;
  }).reverse().filter(Boolean);
  return (terms.join('+') || '0').replace(/\+-/g, '-');
}
export function solveRelation(parsed: Parsed) {
  if (!parsed.relation || !parsed.right) throw new UnsupportedError('Expected relation');
  const left = polynomial(parsed.left), right = polynomial(parsed.right);
  const diff = combine(left, { ...right, coefficients: right.coefficients.map(value => value.neg()) });
  if (diff.coefficients.length !== 2 || !diff.variable) throw new UnsupportedError('Not a unique linear solution');
  const coefficient = diff.coefficients[1];
  const value = diff.coefficients[0].neg().div(coefficient);
  const reverse: Record<Relation, Relation> = { '=': '=', '<': '>', '<=': '>=', '>': '<', '>=': '<=' };
  return { variable: diff.variable, relation: coefficient.n < BigInt(0) ? reverse[parsed.relation] : parsed.relation, value: value.toString() };
}

export const TOLERANCE=1e-9,MIN_POINTS=6;
const POINTS=[-2.2,-1.3,-0.63,-0.37,0.11,0.5,1.9,2.71,3.9,7.1,0.25,4];
const PAIRS=[[-2.2,-2.2],[-1.3,-1.3],[-0.63,-0.63],[-0.37,-0.37],[0.11,0.11],[0.5,0.5],[-2.2,-1.3],[-1.3,-0.63],[-0.63,-0.37],[-0.37,0.11],[0.11,0.5],[0.5,-2.2]];
export function variables(expr:Expr):Set<string> {
 if(expr.kind==='variable')return new Set([expr.name]);
 const children=expr.kind==='binary'?[expr.left,expr.right]:expr.kind==='neg'?[expr.value]:expr.kind==='call'?expr.args:[];
 return new Set(children.flatMap(child=>[...variables(child)]));
}
export function numeric(expr:Expr,env:Record<string,number>={}):number {
 if(expr.kind==='number')return Number(expr.value.n)/Number(expr.value.d);
 if(expr.kind==='variable')return env[expr.name]??NaN;
 if(expr.kind==='constant')return Math.PI;
 if(expr.kind==='neg')return -numeric(expr.value,env);
 if(expr.kind==='call'){
  const [a,b]=expr.args.map(arg=>numeric(arg,env));
  if(!Number.isFinite(a)||b!==undefined&&!Number.isFinite(b))return NaN;
  switch(expr.fn){
   case 'sqrt':return Math.sqrt(a);
   case 'abs':return Math.abs(a);
   case 'ln':return a>0?Math.log(a):NaN;
   case 'exp':return Math.exp(a);
   case 'sin':return Math.sin(a);
   case 'cos':return Math.cos(a);
   case 'tan':return Math.tan(a);
   case 'log':return b===undefined?(a>0?Math.log10(a):NaN):a>0&&a!==1&&b>0?Math.log(b)/Math.log(a):NaN;
   case 'root':return a===0?NaN:b<0?(Number.isInteger(a)&&Math.abs(a%2)===1?-Math.pow(-b,1/a):NaN):Math.pow(b,1/a);
  }
 }
 const a=numeric(expr.left,env),b=numeric(expr.right,env);
 if(!Number.isFinite(a)||!Number.isFinite(b))return NaN;
 switch(expr.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '^':return a===0&&b===0?NaN:Math.pow(a,b);}
}
export function numericClose(a:number,b:number,tolerance?:number) {
 return Math.abs(a-b)<=(tolerance??TOLERANCE*Math.max(1,Math.abs(a),Math.abs(b)));
}
export function constantValue(expr:Expr):number {
 if(variables(expr).size)throw new UnsupportedError('Unbound variable');
 const value=numeric(expr);if(!Number.isFinite(value))throw new UnsupportedError('Numeric domain');return value;
}
export function equivalentWithMethod(a:Expr,b:Expr):{equal:boolean;method:'exact'|'numeric'} {
 try{return {equal:exactEquivalent(a,b),method:'exact'};}catch(error){if(!(error instanceof UnsupportedError))throw error;}
 const names=[...new Set([...variables(a),...variables(b)])].sort();if(names.length>2)throw new UnsupportedError('Too many variables');
 const samples=names.length===0?[[]]:names.length===1?POINTS.map(p=>[p]):PAIRS;
 const values=samples.map(point=>{const env=Object.fromEntries(names.map((name,i)=>[name,point[i]]));return [numeric(a,env),numeric(b,env)];}).filter(pair=>pair.every(Number.isFinite));
 if(values.length<(names.length?MIN_POINTS:1))throw new UnsupportedError('Numeric domain');
 return {equal:values.every(([x,y])=>numericClose(x,y)),method:'numeric'};
}
export function equivalent(a:Expr,b:Expr){return equivalentWithMethod(a,b).equal;}
