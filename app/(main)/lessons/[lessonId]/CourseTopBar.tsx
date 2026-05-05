'use client';

import Link from 'next/link';
import { FaChevronLeft } from 'react-icons/fa';
import styles from './lesson.module.css';

interface CourseTopBarProps {
  courseTitle: string;
  backHref: string;
  progressRate: number;
  watchedSeconds: number;
  totalSeconds: number;
}

function formatDurationLong(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function CourseTopBar({
  courseTitle,
  backHref,
  progressRate,
  watchedSeconds,
  totalSeconds,
}: CourseTopBarProps) {
  return (
    <header className={styles.courseTopBar}>
      <div className={styles.courseTopLeft}>
        <Link href={backHref} className={styles.backIconButton} aria-label="강좌 홈으로">
          <FaChevronLeft />
        </Link>
        <h1 className={styles.courseTopTitle}>{courseTitle}</h1>
      </div>

      <div className={styles.courseTopRight}>
        <div className={styles.courseStat}>
          <span className={styles.courseStatLabel}>수강률</span>
          <span className={styles.courseStatValue}>{progressRate.toFixed(1)}%</span>
        </div>
        <div className={styles.courseStat}>
          <span className={styles.courseStatLabel}>수강시간</span>
          <span className={styles.courseStatValue}>{formatDurationLong(watchedSeconds)}</span>
        </div>
        <div className={styles.courseStat}>
          <span className={styles.courseStatLabel}>강의시간</span>
          <span className={styles.courseStatValue}>{formatDurationLong(totalSeconds)}</span>
        </div>
      </div>
    </header>
  );
}
