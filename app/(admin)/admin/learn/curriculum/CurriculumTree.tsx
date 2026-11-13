'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Catalog, CatalogLesson } from '@/lib/learn/lessons/master';
import styles from './curriculum.module.css';

export type PackSummary = { id: string; title: string; access: string; count: number };
type Filter = 'all' | 'made' | 'unpacked' | 'draft' | 'empty';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'made', label: '강의 있음' }, { id: 'unpacked', label: '팩 미편성' }, { id: 'draft', label: '초안' }, { id: 'empty', label: '강의 없음' },
];
const STATUS: Record<string, string> = { draft: '초안', reviewed: '검수', live: '공개' };
const squash = (text: string) => text.replace(/s+/g, '');
const lessonMatches = (filter: Filter, lesson: CatalogLesson) => filter === 'unpacked' ? lesson.packs.length === 0 : filter === 'draft' ? lesson.status === 'draft' : true;

function LessonRow({ lesson, multiPack }: { lesson: CatalogLesson; multiPack: boolean }) {
  const detail = `${lesson.id} · v${lesson.version} ${STATUS[lesson.status] ?? lesson.status}` + (lesson.published !== null && lesson.published !== lesson.version ? ` · 학습자에게는 v${lesson.published}` : '');
  return <li className={styles.lesson}>
    <Link href={`/learn/lesson/${encodeURIComponent(lesson.id)}?draft=1`} title={`${detail}\n눌러서 미리보기`}>
      <i className={styles.dot} data-status={lesson.status} aria-hidden="true" />
      <span className={styles.name}>{lesson.kind === 'worked' && <span className={styles.kind}>풀이</span>}{lesson.title}</span>
      <span className={styles.srOnly}>{STATUS[lesson.status] ?? lesson.status}</span>
      {lesson.packs.length ? lesson.packs.map(pack => <span key={pack.id} className={styles.badge} title={pack.title}>{multiPack ? `${pack.title} ` : ''}{pack.no}강</span>) : <span className={styles.badge} data-none="true" title="어느 팩에도 없어 학습자에게 보이지 않습니다">미편성</span>}
    </Link>
  </li>;
}

export function CurriculumTree({ catalog, packs }: { catalog: Catalog; packs: PackSummary[] }) {
  const [filter, setFilter] = useState<Filter>('all'), [query, setQuery] = useState('');
  // 강의가 있는 과목·대단원만 처음에 펼친다.
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(catalog.subjects.flatMap(subject => [[subject.id, subject.covered > 0], ...subject.units.map(unit => [unit.id, unit.topics.some(topic => topic.lessons.length > 0)] as [string, boolean])])));
  const narrowed = filter !== 'all' || query.trim() !== '', multiPack = packs.length > 1;

  const tree = useMemo(() => {
    const word = query.trim().toLowerCase(), hit = (text: string) => !word || text.toLowerCase().includes(word);
    return catalog.subjects.map(subject => ({ ...subject, units: subject.units.map(unit => ({ ...unit, topics: unit.topics.map(topic => {
      const lessons = topic.lessons.filter(lesson => lessonMatches(filter, lesson));
      const byFilter = filter === 'all' ? true : filter === 'empty' ? topic.lessons.length === 0 : filter === 'made' ? topic.lessons.length > 0 : lessons.length > 0;
      const byQuery = hit(topic.title) || hit(unit.title) || hit(subject.title) || lessons.some(lesson => hit(lesson.title) || hit(lesson.id));
      return byFilter && byQuery ? { ...topic, lessons } : null;
    }).filter(topic => topic !== null) })).filter(unit => unit.topics.length > 0) })).filter(subject => subject.units.length > 0);
  }, [catalog, filter, query]);

  const isOpen = (id: string) => narrowed || (open[id] ?? false);
  const toggle = (id: string) => setOpen(old => ({ ...old, [id]: !(old[id] ?? false) }));
  const setAll = (value: boolean) => setOpen(Object.fromEntries(catalog.subjects.flatMap(subject => [[subject.id, value], ...subject.units.map(unit => [unit.id, value] as [string, boolean])])));
  const shown = tree.reduce((n, subject) => n + subject.units.reduce((m, unit) => m + unit.topics.length, 0), 0), t = catalog.totals;

  return <section className={styles.page}>
    <header className={styles.header}>
      <h1>전체 커리큘럼</h1>
      <p className={styles.summary}>소단원 {t.covered}/{t.topics}에 강의 {t.lessons}개 · {packs.map(pack => `${pack.title}(${pack.access} ${pack.count}강)`).join(' · ')}</p>
    </header>

    <div className={styles.toolbar}>
      <div className={styles.filters} role="group" aria-label="보기">{FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div>
      <input className={styles.search} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="단원·강의 찾기" aria-label="단원·강의 찾기" />
      {!narrowed && <div className={styles.fold}><button type="button" onClick={() => setAll(true)}>모두 펼치기</button><button type="button" onClick={() => setAll(false)}>모두 접기</button></div>}
    </div>

    <p className={styles.legend}><i className={styles.dot} data-status="reviewed" aria-hidden="true" />검수·공개 <i className={styles.dot} data-status="draft" aria-hidden="true" />초안 <span className={styles.badge}>3강</span>팩에서의 번호 <span className={styles.badge} data-none="true">미편성</span>학습자에게 안 보임 · 강의를 누르면 미리보기</p>

    {catalog.unplaced.length > 0 && !narrowed && <div className={styles.unplaced}><strong>소단원에 붙지 않은 강의</strong><ul className={styles.lessons}>{catalog.unplaced.map(lesson => <LessonRow key={lesson.id} lesson={lesson} multiPack={multiPack} />)}</ul></div>}

    {narrowed && <p className={styles.result} role="status">소단원 {shown}개</p>}
    <ul className={styles.tree}>{tree.map(subject => {
      const original = catalog.subjects.find(entry => entry.id === subject.id)!;
      return <li key={subject.id} className={styles.subject}>
        <button type="button" className={styles.row} aria-expanded={isOpen(subject.id)} onClick={() => toggle(subject.id)} disabled={narrowed}>
          <span className={styles.caret} aria-hidden="true" /><strong>{subject.title}</strong>{subject.optional && <span className={styles.tag}>선택</span>}
          <span className={styles.progress} title={`소단원 ${original.topics}개 중 ${original.covered}개에 강의가 있습니다`}><progress max={original.topics} value={original.covered} />{original.covered}/{original.topics}</span>
        </button>
        {isOpen(subject.id) && <ul className={styles.branch}>{subject.units.map(unit => {
          const all = original.units.find(entry => entry.id === unit.id)!.topics, made = all.filter(topic => topic.lessons.length > 0).length;
          return <li key={unit.id}>
            <button type="button" className={styles.row} aria-expanded={isOpen(unit.id)} onClick={() => toggle(unit.id)} disabled={narrowed}>
              <span className={styles.caret} aria-hidden="true" /><span>{unit.no}. {unit.title}</span><span className={styles.count} data-done={made === all.length} data-none={made === 0}>{made}/{all.length}</span>
            </button>
            {isOpen(unit.id) && <ul className={styles.branch}>{unit.topics.map(topic => {
              // 소단원과 강의 이름이 같고 강의가 하나면 한 줄로 합친다.
              const same = topic.lessons.length === 1 && squash(topic.lessons[0].title) === squash(topic.title);
              return <li key={topic.key} className={styles.topic} data-empty={topic.lessons.length === 0}>
                {!same && <span className={styles.topicTitle} title={`개념 ${topic.concepts} · 문제 ${topic.problems}${topic.planned ? ' · 내용 보완 예정' : ''}`}>{topic.title}</span>}
                {topic.lessons.length > 0 && <ul className={same ? styles.lessons : styles.lessons + ' ' + styles.nested}>{topic.lessons.map(lesson => <LessonRow key={lesson.id} lesson={lesson} multiPack={multiPack} />)}</ul>}
              </li>;
            })}</ul>}
          </li>;
        })}</ul>}
      </li>;
    })}</ul>
    {tree.length === 0 && <p className={styles.result}>조건에 맞는 소단원이 없습니다.</p>}
  </section>;
}
