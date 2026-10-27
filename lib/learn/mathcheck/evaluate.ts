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
export function equivalent(a: Expr, b: Expr) {
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
