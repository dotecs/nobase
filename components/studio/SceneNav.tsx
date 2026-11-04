'use client';
import { FiChevronLeft, FiChevronRight, FiCheck, FiSkipForward } from 'react-icons/fi';
import type { Scene } from '@/lib/learn/lessons/schema';
import styles from './navigation.module.css';

export function SceneNav({ scenes, index, ended, onMove, onComplete, player, autoAdvance = false, onToggleAutoAdvance, completionLabel = '학습 홈으로' }: {
  autoAdvance?: boolean; onToggleAutoAdvance?: () => void;
  completionLabel?: string; player?: React.ReactNode; scenes: Pick<Scene, 'id' | 'title'>[];
  index: number; ended: boolean; onMove: (index: number) => void; onComplete: () => void;
}) {
  const last = index === scenes.length - 1;
  return <nav className={styles.nav} aria-label="장면 이동">
    <div className={styles.transport}>{player}</div>
    <div className={styles.actions}><div className={styles.progress}>
      <button type="button" aria-label="이전 장면" title="이전 장면" disabled={index === 0} onClick={() => onMove(index - 1)}>
        <FiChevronLeft aria-hidden="true" />
      </button>
      <span aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(scenes.length).padStart(2, '0')}</span>
      <button type="button" className={last ? styles.next : undefined} aria-label={last ? completionLabel : '다음 장면'}
        title={last ? completionLabel : '다음 장면'} data-ended={last && ended} onClick={() => last ? onComplete() : onMove(index + 1)}>
        {last ? <FiCheck aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
      </button>
    </div>
    {onToggleAutoAdvance && <button type="button" className={styles.autoAdvance} aria-label="다음 장면 자동 이동" aria-pressed={autoAdvance}
      title={autoAdvance?'자동 넘김 켜짐 — 장면이 끝나면 다음 장면을 재생합니다':'자동 넘김 꺼짐 — 장면이 끝나면 멈춥니다'} onClick={onToggleAutoAdvance}>
      <FiSkipForward aria-hidden="true"/><span>자동 넘김</span><small>{autoAdvance?'켬':'끔'}</small>
    </button>}
    </div>
  </nav>;
}
