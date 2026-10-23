'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { normalizeCategory, programCategories } from '@/content/programs';
import { home } from '@/content/home';
import type { ProgramView } from '@/lib/programs';
import FilterChip from '@/components/FilterChip/FilterChip';
import ProgramCard from '@/components/ProgramCard/ProgramCard';
import Button from '@/components/Button/Button';
import styles from './ProgramExplorer.module.css';

export default function ProgramExplorer({ programs, syncUrl = false, initialCategory = 'all', enrolledHrefs = {} }: {
  programs: ProgramView[]; syncUrl?: boolean; initialCategory?: string; enrolledHrefs?: Record<string, string>;
}) {
  const params = useSearchParams();
  const [localCategory, setLocalCategory] = useState(normalizeCategory(initialCategory));
  const category = syncUrl ? normalizeCategory(params.get('category')) : localCategory;
  const select = (value: string) => {
    const next = normalizeCategory(value);
    if (!syncUrl) { setLocalCategory(next); return; }
    const url = new URL(window.location.href);
    if (next === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', next);
    window.history.pushState(null, '', url);
  };
  const visible = programs.filter(program => category === 'all' || program.category === category);
  return <div className={styles.explorer}>
    <FilterChip options={programCategories} label={home.programs.filterLabel} value={category} onChange={select} />
    <div aria-live="polite" aria-atomic="true" className="sr-only">{programCategories.find(item => item.id === category)?.label}: {visible.length}</div>
    {visible.length ? <div className={styles.grid}>{visible.map(program => <ProgramCard key={program.slug} program={program} enrolledHref={program.courseId ? enrolledHrefs[program.courseId] : undefined} />)}</div>
      : <div className={styles.empty}><p>{home.programs.empty}</p><Button variant="outline" onClick={() => select('all')}>{home.programs.reset}</Button></div>}
    <p className={styles.note}>{home.programs.note}</p>
  </div>;
}
