'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './math-test.module.css';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MathJax?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    katex?: any;
  }
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        children?: string;
      };
    }
  }
}

export default function MathTestPage() {
  const [mathLiveLoaded, setMathLiveLoaded] = useState(false);
  const [mathJaxLoaded, setMathJaxLoaded] = useState(false);
  const [katexLoaded, setKatexLoaded] = useState(false);
  const [mathLiveValue, setMathLiveValue] = useState('x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}');
  const katexRef = useRef<HTMLDivElement>(null);
  const mathJaxRef = useRef<HTMLDivElement>(null);
  const chemRef = useRef<HTMLDivElement>(null);

  // Load KaTeX
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
    script.onload = () => setKatexLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  // Load MathJax with mhchem
  useEffect(() => {
    (window as any).MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        packages: { '[+]': ['mhchem'] }
      },
      loader: { load: ['[tex]/mhchem'] },
      startup: {
        ready: () => {
          window.MathJax.startup.defaultReady();
          setMathJaxLoaded(true);
        }
      }
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Load MathLive
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/mathlive';
    script.onload = () => setMathLiveLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Render KaTeX examples
  useEffect(() => {
    if (katexLoaded && katexRef.current && window.katex) {
      const formulas = [
        'E = mc^2',
        '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}',
        '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}',
        '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1'
      ];

      katexRef.current.innerHTML = formulas
        .map((f) => {
          try {
            return `<div class="${styles.formula}">${window.katex.renderToString(f, { displayMode: true })}</div>`;
          } catch (e) {
            return `<div class="${styles.error}">Error: ${e}</div>`;
          }
        })
        .join('');
    }
  }, [katexLoaded]);

  // Render MathJax examples
  useEffect(() => {
    if (mathJaxLoaded && mathJaxRef.current && window.MathJax) {
      mathJaxRef.current.innerHTML = `
        <div class="${styles.formula}">$$\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t}$$</div>
        <div class="${styles.formula}">$$\\oint \\vec{B} \\cdot d\\vec{l} = \\mu_0 I + \\mu_0 \\epsilon_0 \\frac{d\\Phi_E}{dt}$$</div>
        <div class="${styles.formula}">$$i\\hbar\\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi$$</div>
      `;
      window.MathJax.typesetPromise([mathJaxRef.current]);
    }
  }, [mathJaxLoaded]);

  // Render Chemistry examples with mhchem
  useEffect(() => {
    if (mathJaxLoaded && chemRef.current && window.MathJax) {
      chemRef.current.innerHTML = `
        <div class="${styles.formula}">$$\\ce{H2O}$$ (물)</div>
        <div class="${styles.formula}">$$\\ce{H2SO4}$$ (황산)</div>
        <div class="${styles.formula}">$$\\ce{2H2 + O2 -> 2H2O}$$ (수소 연소)</div>
        <div class="${styles.formula}">$$\\ce{CO2 + C -> 2CO}$$</div>
        <div class="${styles.formula}">$$\\ce{CH3CH2OH}$$ (에탄올)</div>
        <div class="${styles.formula}">$$\\ce{Fe^{2+} + 2OH^{-} -> Fe(OH)2 v}$$ (침전 반응)</div>
        <div class="${styles.formula}">$$\\ce{^{14}_{6}C}$$ (탄소-14 동위원소)</div>
        <div class="${styles.formula}">$$\\ce{A <=> B}$$ (가역 반응)</div>
      `;
      window.MathJax.typesetPromise([chemRef.current]);
    }
  }, [mathJaxLoaded]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>수식 & 화학식 라이브러리 테스트</h1>
      
      {/* KaTeX Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          📐 KaTeX
          <span className={styles.status}>
            {katexLoaded ? '✅ 로드됨' : '⏳ 로딩중...'}
          </span>
        </h2>
        <p className={styles.description}>빠른 수학 수식 렌더링 라이브러리</p>
        <div ref={katexRef} className={styles.content}>
          {!katexLoaded && <div className={styles.loading}>로딩 중...</div>}
        </div>
      </section>

      {/* MathJax Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          🔢 MathJax
          <span className={styles.status}>
            {mathJaxLoaded ? '✅ 로드됨' : '⏳ 로딩중...'}
          </span>
        </h2>
        <p className={styles.description}>강력한 수학 수식 렌더링 (물리 공식 예시)</p>
        <div ref={mathJaxRef} className={styles.content}>
          {!mathJaxLoaded && <div className={styles.loading}>로딩 중...</div>}
        </div>
      </section>

      {/* Chemistry Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          ⚗️ mhchem (화학식)
          <span className={styles.status}>
            {mathJaxLoaded ? '✅ 로드됨' : '⏳ 로딩중...'}
          </span>
        </h2>
        <p className={styles.description}>MathJax 확장 - 화학식 및 반응식</p>
        <div ref={chemRef} className={styles.content}>
          {!mathJaxLoaded && <div className={styles.loading}>로딩 중...</div>}
        </div>
      </section>

      {/* MathLive Editor Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          ✏️ MathLive (편집 가능)
          <span className={styles.status}>
            {mathLiveLoaded ? '✅ 로드됨' : '⏳ 로딩중...'}
          </span>
        </h2>
        <p className={styles.description}>실시간 수식 편집기 - 직접 수정해보세요!</p>
        <div className={styles.content}>
          {mathLiveLoaded ? (
            <div className={styles.editorWrapper}>
              <math-field
                className={styles.mathField}
                onInput={(e: any) => setMathLiveValue(e.target.value)}
              >
                {mathLiveValue}
              </math-field>
              <div className={styles.latexOutput}>
                <strong>LaTeX 출력:</strong>
                <code>{mathLiveValue}</code>
              </div>
            </div>
          ) : (
            <div className={styles.loading}>로딩 중...</div>
          )}
        </div>
      </section>

      {/* 사용법 안내 */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>📖 사용법 안내</h2>
        <div className={styles.usageGrid}>
          <div className={styles.usageCard}>
            <h3>KaTeX</h3>
            <code>npm install katex</code>
            <p>빠른 렌더링이 필요할 때</p>
          </div>
          <div className={styles.usageCard}>
            <h3>MathJax</h3>
            <code>CDN 사용 권장</code>
            <p>복잡한 수식 + 화학식</p>
          </div>
          <div className={styles.usageCard}>
            <h3>MathLive</h3>
            <code>npm install mathlive</code>
            <p>사용자 입력이 필요할 때</p>
          </div>
          <div className={styles.usageCard}>
            <h3>mhchem</h3>
            <code>MathJax 확장</code>
            <p>화학식 전용</p>
          </div>
        </div>
      </section>
    </div>
  );
}
