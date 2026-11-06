'use client';
import { FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';
import type { Scene } from '@/lib/learn/lessons/schema';
import styles from './navigation.module.css';

export function SceneNav({ scenes, index, ended, onMove, onComplete, player, completionLabel = '학습 홈으로' }: {
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

    </div>
  </nav>;
}
