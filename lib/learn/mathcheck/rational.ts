const ZERO = BigInt(0), ONE = BigInt(1);
function gcd(a: bigint, b: bigint): bigint { a = a < ZERO ? -a : a; b = b < ZERO ? -b : b; while (b !== ZERO) [a, b] = [b, a % b]; return a; }
export class Rational {
  readonly n: bigint;
  readonly d: bigint;
  constructor(n: bigint | number, d: bigint | number = ONE) {
    n = BigInt(n); d = BigInt(d);
    if (d === ZERO) throw new Error('Zero denominator');
    if (d < ZERO) { n = -n; d = -d; }
    const factor = gcd(n, d); this.n = n / factor; this.d = d / factor;
  }
  static parse(value: string): Rational {
    if (value.length > 256) throw new Error('Number too long');
    if (/^[+-]?\d+\/[+-]?\d+$/.test(value)) { const [n, d] = value.split('/'); return new Rational(BigInt(n), BigInt(d)); }
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(value)) throw new Error('Invalid rational');
    const [integer, decimal = ''] = value.split('.');
    return new Rational(BigInt(integer + decimal), BigInt(10) ** BigInt(decimal.length));
  }
  add(b: Rational) { return new Rational(this.n * b.d + b.n * this.d, this.d * b.d); }
  sub(b: Rational) { return this.add(b.neg()); }
  mul(b: Rational) { return new Rational(this.n * b.n, this.d * b.d); }
  div(b: Rational) { return new Rational(this.n * b.d, this.d * b.n); }
  neg() { return new Rational(-this.n, this.d); }
  compare(b: Rational) { const diff = this.n * b.d - b.n * this.d; return diff < ZERO ? -1 : diff > ZERO ? 1 : 0; }
  toString() { return this.d === ONE ? String(this.n) : `${this.n}/${this.d}`; }
}
