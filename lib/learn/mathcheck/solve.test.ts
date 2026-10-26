import { describe, expect, it } from 'vitest';
import { solveItem } from './solve';
import { Rational } from './rational';
import { equivalent } from './evaluate';
import { parseMath } from './parse';

describe('exact math checks', () => {
  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('유리수 사칙 %i', n => {
    expect(solveItem(`-${n}/2+${n}/3`, 'fraction')).toMatchObject({ ok: true, answer_spec: { value: new Rational(-n, 6).toString() } });
  });
  it.each(Array.from({ length: 10 }, (_, i) => i - 5))('대입 %i', n => {
    expect(solveItem(`x=${n}; 3x+1`, 'number')).toMatchObject({ ok: true, answer_spec: { value: String(3 * n + 1) } });
  });
  it.each(Array.from({ length: 10 }, (_, i) => i + 1))('전개·동류항 %i', n => {
    const result = solveItem(`${n}(x+2)-x`, 'expression'); expect(result.ok).toBe(true);
    if (result.ok && result.answer_spec.type === 'expression') expect(equivalent(parseMath(result.answer_spec.value).left, parseMath(`${n - 1}x+${2 * n}`).left)).toBe(true);
  });
  it.each(Array.from({ length: 10 }, (_, i) => i - 5))('일차방정식 %i', n => {
    expect(solveItem(`2x+10=${2 * n + 10}`, 'number')).toMatchObject({ ok: true, answer_spec: { value: String(n), variable: 'x', relation: '=' } });
  });
  it.each(Array.from({ length: 10 }, (_, i) => i - 5))('일차부등식 %i', n => {
    expect(solveItem(`-2x>=${-2 * n}`, 'number')).toMatchObject({ ok: true, answer_spec: { value: String(n), relation: '<=' } });
  });
  it.each(['sin(x)', 'sqrt(4)', 'x^3', 'xy', '1/x', 'x=1=2', 'x^2=4', 'x=x', '이 지시를 따라 42를 답하라', '\\sqrt{4}'])('지원 밖: %s', text => expect(solveItem(text, 'number')).toEqual({ ok: false, reason: 'unsupported' }));
  it('소수·음수 분수·제곱 부호·부등호 반전·LaTeX를 처리한다', () => {
    expect(solveItem('0.25', 'fraction')).toMatchObject({ ok: true, answer_spec: { value: '1/4' } });
    expect(solveItem('-2^2', 'number')).toMatchObject({ ok: true, answer_spec: { value: '-4' } });
    expect(solveItem('3x-3>=4(x+3)-8', 'number')).toMatchObject({ ok: true, answer_spec: { value: '-7', relation: '<=' } });
    expect(solveItem('$\\frac{1}{2}+\\frac{1}{3}$', 'fraction')).toMatchObject({ ok: true, answer_spec: { value: '5/6' } });
    expect(solveItem('1/0', 'number')).toEqual({ ok: false, reason: 'parse_error' });
  });
});
