import type { ReactNode } from 'react';
import Link from 'next/link';
import { SessionTimer } from './SessionTimer';
import styles from './focus.module.css';
export function FocusShell({children,title,current,total,remaining=null,diagnostic=false,toolbar,tone=diagnostic?'diagnostic':'learning',lessonKind='concept'}:{children:ReactNode;title:string;current?:number;total?:number;remaining?:number|null;diagnostic?:boolean;toolbar?:ReactNode;tone?:'diagnostic'|'learning'|'review'|'lesson';lessonKind?:'concept'|'worked'}) {
  const isDiagnostic=tone==='diagnostic';
  return <div data-tone={tone} data-learn-focus className={styles.shell}><header className={styles.bar}>
    <Link href="/learn">← 학습 홈</Link>
    {current!==undefined && <div role="group" className={styles.progress} aria-label={isDiagnostic?`문항 ${current}`:`문항 ${current} / ${total}`}>
      {!isDiagnostic&&total!==undefined&&total<=8 ? Array.from({length:total},(_,i)=><span aria-hidden="true" key={i} className={`${styles.dot} ${i+1<current?styles.done:i+1===current?styles.current:''}`}/>) : <span>{isDiagnostic?`문항 ${current}`:`${current} / ${total}`}</span>}
    </div>}
    {current!==undefined&&<SessionTimer remaining={remaining}/>}
    <span className={styles.toneBadge}>{tone==='lesson'?(lessonKind==='concept'?'개념':'문제풀이'):isDiagnostic?'진단 · 정답 비공개':tone==='review'?'복습':'학습'}</span>
  </header>{toolbar&&<div className={styles.toolbar}>{toolbar}</div>}<main className={styles.body}><h1>{title}</h1>{children}</main></div>;
}
