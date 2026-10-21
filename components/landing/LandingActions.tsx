'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiMessageCircle } from 'react-icons/fi';
import styles from './LandingActions.module.css';

export default function LandingActions({ primary, talk }: {
  primary: { href: string; label: string };
  talk?: { href: string; label: string };
}) {
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const hero = document.getElementById('top');
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.bottom <= 80);
    }, { rootMargin: '-80px 0px 0px 0px' });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);
  return <>
    {pastHero && <div className={styles.bar}><Link href={primary.href}>{primary.label}<span aria-hidden="true">›</span></Link></div>}
    {talk && <a href={talk.href} target="_blank" rel="noopener noreferrer" className={`${styles.talk} ${pastHero ? styles.raised : ''}`} aria-label={talk.label}><FiMessageCircle aria-hidden="true" /><span>{talk.label}</span></a>}
  </>;
}
