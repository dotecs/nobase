'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatTimelineTime } from '@/lib/learn/lessons/timeline';
import type { NextLessonAction } from '@/lib/learn/lessons/curriculum';
import styles from './complete.module.css';

export function StudioComplete({ lessonProgress, autoNext=false, open, seen, total, elapsed, gaps, next, onClose, onProceed, onPractice, notice }: {
  lessonProgress?: number; autoNext?: boolean; open: boolean; seen: number; total: number; elapsed: number; gaps: { id: string; name: string }[];
  next: NextLessonAction; onClose: () => void; onProceed: () => Promise<void>; onPractice?: () => void; notice?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const leaving = useRef(false);
  const [countdown,setCountdown]=useState<number|null>(null),proceed=useRef(onProceed);proceed.current=onProceed;
  useEffect(()=>{setCountdown(open&&autoNext&&next.lessonId?5:null);},[open,autoNext,next.lessonId]);
  useEffect(()=>{if(countdown===null||!open)return;const timer=setTimeout(()=>{if(countdown>1)setCountdown(countdown-1);else {setCountdown(null);if(!leaving.current){leaving.current=true;void proceed.current().finally(()=>{leaving.current=false;});}}},1000);return()=>clearTimeout(timer);},[countdown,open]);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previous = document.activeElement as HTMLElement | null;
    leaving.current = false;
    if (!element.open) element.showModal();
    element.querySelector<HTMLAnchorElement>('[data-completion-next]')?.focus();
    return () => { if (element.open) element.close(); previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="studio-complete-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { const box = event.currentTarget.getBoundingClientRect(); if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) onClose(); }}>
    <p className={styles.eyebrow}>한 걸음 더 이해했어요</p><h2 id="studio-complete-title">오늘의 레슨을 마쳤어요</h2>
    <dl><div><dt>{lessonProgress===undefined?'본 장면':'강의 진행률'}</dt><dd>{lessonProgress===undefined?<>{seen} / {total}</>:Math.round(Math.max(0,Math.min(1,lessonProgress))*100)+'%'}</dd></div><div><dt>걸린 시간</dt><dd>{formatTimelineTime(elapsed)}</dd></div></dl>
    {gaps.length > 0 && <div className={styles.gaps}><h3>다시 살펴볼 개념</h3><ul>{gaps.map(gap => <li key={gap.id}><Link href={'/learn/concept/' + gap.id}>{gap.name}</Link></li>)}</ul></div>}
    {notice && <p role="status">{notice}</p>}{countdown!==null&&<p role="status">{countdown}초 후 다음 강을 재생합니다. <button type="button" onClick={()=>setCountdown(null)}>자동 재생 취소</button></p>}
    <div className={styles.actions}>
      <a data-completion-next href={next.href} className={styles.primary} onClick={async event => { event.preventDefault(); if (leaving.current) return; leaving.current = true; try { await onProceed(); } finally { leaving.current = false; } }}>{next.label}{next.lessonId && <span aria-hidden="true"> →</span>}</a>
      {onPractice ? <button type="button" onClick={()=>{setCountdown(null);onPractice();}}>연습 문제로</button> : <Link href="/learn">연습 문제로</Link>}
      <button type="button" onClick={onClose}>닫기</button>
    </div>
  </dialog>;
}
