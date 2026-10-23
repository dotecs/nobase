'use client';

import Image from 'next/image';
import { useState } from 'react';
import { FiArrowRight, FiBook } from 'react-icons/fi';
import type { ProgramView } from '@/lib/programs';
import { home } from '@/content/home';
import Button from '@/components/Button/Button';
import StatusBadge from '@/components/StatusBadge/StatusBadge';
import styles from './ProgramCard.module.css';

export default function ProgramCard({ program, enrolledHref }: { program: ProgramView; enrolledHref?: string }) {
  const [failedImage, setFailedImage] = useState(false);
  const text = home.programs;
  return <article className={styles.card}>
    <div className={styles.thumbnail}>
      {program.thumbnail && !failedImage ? <Image src={program.thumbnail} alt="" fill sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1023px) 45vw, 384px" onError={() => setFailedImage(true)} />
        : <FiBook size={48} strokeWidth={2} aria-hidden="true" />}
      <div className={styles.statusOverlay}><StatusBadge status={program.status} /></div>
    </div>
    <div className={styles.content}>
      {enrolledHref && <span className={styles.enrolled}>{text.enrolled}</span>}
      <h3>{program.title}</h3><p className={styles.audience}>{program.audience}</p><p className={styles.summary}>{program.summary}</p>
      {program.status === 'comingSoon' ? <Button variant="outline" disabled aria-disabled="true" fullWidth>{text.comingSoon}</Button>
        : <Button href={enrolledHref ?? program.href ?? undefined} variant="outline" fullWidth>{enrolledHref ? text.curriculum : text.more}<FiArrowRight size={24} strokeWidth={2} aria-hidden="true" /></Button>}
    </div>
  </article>;
}
