'use client';

import { useState } from 'react';
import { FiPlay } from 'react-icons/fi';
import styles from './InterviewPlayer.module.css';

export default function InterviewPlayer({ interview }: {
  interview: { title: string; image: string; alt: string; embedUrl: string };
}) {
  const [playing, setPlaying] = useState(false);
  return <article className={styles.card}>
    <div className={styles.frame}>
      {playing ? <iframe src={interview.embedUrl} title={interview.title} loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        : <button type="button" onClick={() => setPlaying(true)} className={styles.facade} aria-label={interview.title}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={interview.image} alt={interview.alt} width={480} height={360} loading="lazy" />
          <span className={styles.play}><FiPlay aria-hidden="true" /></span>
        </button>}
    </div><h3>{interview.title}</h3>
  </article>;
}
