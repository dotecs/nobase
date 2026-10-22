'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { trainingLanding } from '@/content/courses/n-training';
import styles from './WeeklyCurriculum.module.css';

type Curriculum = typeof trainingLanding.curriculum;
export default function WeeklyCurriculum({ content, weeks, freeHref }: {
  content: Curriculum['weekly']; weeks: Curriculum['weeks']; freeHref: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const remainingId = useId();
  const renderRows = (rows: Curriculum['weeks']) => rows.map(row => <tr key={row.week}>
    <th scope="row">{row.week}{content.weekSuffix}</th>
    {[row.math, row.physics, row.chemistry].map((text, i) => <td key={i}><span className={styles.mobileLabel} aria-hidden="true">{content.columns[i + 1]}</span><span>{text}</span></td>)}
  </tr>);
  return <div className={styles.block}>
    <h3 className={styles.title}>{content.title}</h3>
    <Image className={styles.overview} src={content.image} alt={content.alt} width={1400} height={933} loading="lazy" sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1199px) calc(100vw - 48px), 1200px" />
    <table className={styles.table}>
      <caption>{content.tableTitle}</caption>
      <thead><tr>{content.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{renderRows(weeks.slice(0, 10))}</tbody>
      <tbody id={remainingId} hidden={!expanded}>{renderRows(weeks.slice(10))}</tbody>
    </table>
    <button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={remainingId} onClick={() => setExpanded(value => !value)}>{expanded ? content.collapse : content.expand}</button>
    <p className={styles.note}>{content.note}</p>
    {freeHref ? <Link className={styles.recommendation} href={freeHref}>{content.recommendation}<span aria-hidden="true"> ›</span></Link>
      : <p className={styles.recommendation}>{content.recommendation}</p>}
  </div>;
}
