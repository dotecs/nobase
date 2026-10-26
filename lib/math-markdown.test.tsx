import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockMath, InlineMath } from 'react-katex';
import { expect, test } from 'vitest';
import { renderMathMarkdown } from '@/lib/math-markdown';

const html = (nodes: React.ReactNode) => renderToStaticMarkup(<>{nodes}</>);

test('블록 수식의 기존 래퍼와 KaTeX 렌더를 보존한다', () => {
  for (const onError of ['raw', 'message'] as const) {
    expect(html(renderMathMarkdown('$$x^2$$', { blockClassName: 'block', onError })))
      .toBe(html(<div className="block"><BlockMath math="x^2" /></div>));
  }
});

test('문장 안의 인라인 수식 두 개와 일반 텍스트를 보존한다', () => {
  expect(html(renderMathMarkdown('값 $x$와 $y$입니다.'))).toBe(html(<>
    <span>값 </span><InlineMath math="x" /><span>와 </span><InlineMath math="y" /><span>입니다.</span>
  </>));
  expect(html(renderMathMarkdown('일반 텍스트'))).toBe('<span>일반 텍스트</span>');
});

test('닫히지 않은 달러 기호는 두 모드 모두 일반 텍스트로 남긴다', () => {
  for (const onError of ['raw', 'message'] as const) {
    expect(html(renderMathMarkdown('미완성 $x', { onError }))).toBe('<span>미완성 $x</span>');
  }
});

test('실제 KaTeX 파싱 실패를 옵션에 따라 오류 문구 또는 원문으로 표시한다', () => {
  const invalid = String.raw`$\frac{$`;
  expect(html(renderMathMarkdown(invalid, { onError: 'message', errorClassName: 'error' })))
    .toBe('<span class="error">수식 오류</span>');
  expect(html(renderMathMarkdown(invalid, { onError: 'raw' }))).toBe(`<span>${invalid}</span>`);
  expect(html(renderMathMarkdown(invalid))).toBe(`<span>${invalid}</span>`);
  const block = String.raw`$$\frac{$$`;
  expect(html(renderMathMarkdown(block, { onError: 'message', errorClassName: 'error' })))
    .toContain('class="error">수식 오류:');
  expect(html(renderMathMarkdown(block))).toContain(`<span>${block}</span>`);
});
