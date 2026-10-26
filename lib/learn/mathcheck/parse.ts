import { Rational } from './rational';

export class UnsupportedError extends Error {}
export type Expr = { kind: 'number'; value: Rational } | { kind: 'variable'; name: string } | { kind: 'neg'; value: Expr } | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Expr; right: Expr };
export type Relation = '=' | '<' | '<=' | '>' | '>=';
export type Parsed = { left: Expr; relation?: Relation; right?: Expr };

export function normalizeMath(input: string) {
  if (input.length > 4000) throw new UnsupportedError('Expression too long');
  let text = input.trim().replace(/\\(?:left|right)/g, '').replace(/\\(?:dfrac|tfrac)/g, '\\frac');
  for (let count = 0; count < 20 && /\\frac\{([^{}]*)\}\{([^{}]*)\}/.test(text); count++) text = text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
  return text.replace(/\\(?:times|cdot)/g, '*').replace(/\\div/g, '/').replace(/\\(?:leq|le)(?![a-z])/g, '<=').replace(/\\(?:geq|ge)(?![a-z])/g, '>=')
    .replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/[{}]/g, match => match === '{' ? '(' : ')');
}
export function parseMath(input: string): Parsed {
  const text = normalizeMath(input);
  const tokens = text.match(/\d+(?:\.\d+)?|[a-z]|<=|>=|[+*/^()=<>-]/g) ?? [];
  if (tokens.join('') !== text.replace(/\s/g, '')) throw new UnsupportedError('Unsupported notation');
  if (tokens.length > 600) throw new UnsupportedError('Too many tokens');
  let pos = 0, depth = 0;
  const peek = () => tokens[pos];
  const binary = (op: '+' | '-' | '*' | '/' | '^', left: Expr, right: Expr): Expr => ({ kind: 'binary', op, left, right });
  function atom(): Expr {
    const token = tokens[pos++];
    if (token === '(') {
      if (++depth > 40) throw new UnsupportedError('Too deeply nested');
      const value = sum(); if (tokens[pos++] !== ')') throw new Error('Missing closing parenthesis'); depth--; return value;
    }
    if (/^\d/.test(token ?? '')) return { kind: 'number', value: Rational.parse(token) };
    if (/^[a-z]$/.test(token ?? '')) return { kind: 'variable', name: token };
    throw new Error('Expected number or variable');
  }
  function power(): Expr { const left = atom(); if (peek() === '^') { pos++; return binary('^', left, unary()); } return left; }
  function unary(): Expr { if (peek() === '+' || peek() === '-') { const op = tokens[pos++]; const value = unary(); return op === '-' ? { kind: 'neg', value } : value; } return power(); }
  function product(): Expr {
    let left = unary();
    while (peek() === '*' || peek() === '/' || peek() === '(' || /^[a-z]$/.test(peek() ?? '')) {
      const op = peek() === '*' || peek() === '/' ? tokens[pos++] as '*' | '/' : '*';
      left = binary(op, left, unary());
    }
    return left;
  }
  function sum(): Expr { let left = product(); while (peek() === '+' || peek() === '-') { const op = tokens[pos++] as '+' | '-'; left = binary(op, left, product()); } return left; }
  const left = sum();
  let relation: Relation | undefined, right: Expr | undefined;
  if (['=', '<', '<=', '>', '>='].includes(peek())) { relation = tokens[pos++] as Relation; right = sum(); }
  if (pos !== tokens.length) throw new UnsupportedError('Multiple relations or unsupported syntax');
  return { left, relation, right };
}
