'use client';

import Link from 'next/link';
import { FaChevronLeft, FaChevronRight, FaExpand } from 'react-icons/fa';
import styles from './lesson.module.css';

interface NavLesson {
  id: string;
  title: string;
}

interface VideoControlBarProps {
  prevLesson: NavLesson | null;
  nextLesson: NavLesson | null;
  fallbackHref: string;
}

export default function VideoControlBar({ prevLesson, nextLesson, fallbackHref }: VideoControlBarProps) {
  return (
    <div className={styles.videoControlBar}>
      <div className={styles.videoControlNav}>
        {prevLesson ? (
          <Link href={`/lessons/${prevLesson.id}`} className={styles.videoNavButton}>
            <FaChevronLeft /> 이전 강의
          </Link>
        ) : (
          <span className={`${styles.videoNavButton} ${styles.videoNavButtonDisabled}`}>
            <FaChevronLeft /> 이전 강의
          </span>
        )}

        {nextLesson ? (
          <Link href={`/lessons/${nextLesson.id}`} className={styles.videoNavButton}>
            다음 강의 <FaChevronRight />
          </Link>
        ) : (
          <Link href={fallbackHref} className={styles.videoNavButton}>
            강좌 홈 <FaChevronRight />
          </Link>
        )}
      </div>

      <button type="button" className={styles.videoExpandButton} aria-label="넓은 화면">
        <FaExpand />
        <span>넓은 화면</span>
      </button>
    </div>
  );
}
