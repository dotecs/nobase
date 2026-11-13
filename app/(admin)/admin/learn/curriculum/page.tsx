import Link from 'next/link';
import { requireCoach, runtimeError } from '@/lib/learn/runtime';
import { lessonDb } from '@/lib/learn/lessons/data';
import { buildCatalog, lessonStates, type CatalogLesson } from '@/lib/learn/lessons/master';
import { PACKS, packLessonIds } from '@/lib/learn/lessons/packs';
import styles from './curriculum.module.css';

export const metadata = { title: '전체 커리큘럼', robots: { index: false, follow: false } };
const STATUS: Record<string, string> = { draft: '초안', reviewed: '검수', live: '공개' };
const ACCESS = { free: '무료', enrolled: '수강생' } as const;

function LessonChip({ lesson }: { lesson: CatalogLesson }) {
  return <li className={styles.lesson} data-status={lesson.status} data-in-pack={lesson.packs.length > 0}>
    <Link href={`/learn/lesson/${encodeURIComponent(lesson.id)}?draft=1`} title="관리자 미리보기(초안 포함, 시청 기록 없음)">{lesson.title}</Link>
    <span className={styles.meta}>{lesson.id} · {lesson.kind === 'worked' ? '문제풀이' : '개념'} · v{lesson.version} {STATUS[lesson.status] ?? lesson.status}
      {lesson.published !== null && lesson.published !== lesson.version && ` (학습자에게는 v${lesson.published})`}</span>
    <span className={styles.packs}>{lesson.packs.length ? lesson.packs.map(pack => `${pack.title} ${pack.no}강`).join(' · ') : '팩 없음 — 학습자에게 보이지 않음'}</span>
  </li>;
}

export default async function CurriculumPage() {
  try {
    await requireCoach();
    const rows = await lessonDb().from('learn_lessons').select('id,version,title,kind,status').order('id').order('version');
    if (rows.error) throw rows.error;
    const lessons = lessonStates(rows.data ?? []), catalog = buildCatalog(lessons), existing = new Set(lessons.map(lesson => lesson.id)), t = catalog.totals;
    return <section className={styles.page}>
      <h1>전체 커리큘럼</h1>
      <p className={styles.lead}>수학 전 과목의 과목 → 대단원 → 소단원 체계와, 소단원마다 만들어진 강의입니다. 강 번호는 여기에 없고 팩이 정합니다. 학습자에게는 팩에 든 강의만 보입니다.</p>
      <p className={styles.totals}>과목 {t.subjects} · 대단원 {t.units} · 소단원 {t.topics} · 강의가 있는 소단원 {t.covered} · 강의 {t.lessons}개(팩에 든 강의 {t.inPack})</p>

      <h2>팩</h2>
      <ul className={styles.packList}>{PACKS.map(pack => { const ids = packLessonIds(pack), missing = ids.filter(id => !existing.has(id)); return <li key={pack.id}>
        <strong>{pack.title}</strong> <span className={styles.meta}>{pack.id} · {ACCESS[pack.access.kind]}{pack.access.kind === 'free' && ` · 앞 ${pack.access.guest_count}강 비로그인`} · {ids.length}강</span>
        {missing.length > 0 && <span className={styles.warn}> 등록되지 않은 강의: {missing.join(', ')}</span>}
      </li>; })}</ul>

      {catalog.unplaced.length > 0 && <><h2>소단원에 붙지 않은 강의</h2><ul className={styles.lessons}>{catalog.unplaced.map(lesson => <LessonChip key={lesson.id} lesson={lesson} />)}</ul></>}

      <h2>과목</h2>
      {catalog.subjects.map(subject => <details key={subject.id} className={styles.subject} open={subject.covered > 0}>
        <summary><strong>{subject.title}</strong>{subject.optional && <span className={styles.meta}> 선택</span>}<span className={styles.count}>대단원 {subject.units.length} · 소단원 {subject.covered}/{subject.topics}</span></summary>
        {subject.units.map(unit => <div key={unit.id} className={styles.unit}>
          <h3>{unit.no}. {unit.title}</h3>
          <ul className={styles.topics}>{unit.topics.map(topic => <li key={topic.key} data-covered={topic.lessons.length > 0}>
            <div className={styles.topic}><span>{topic.title}{topic.planned && <span className={styles.meta}> (내용 보완 예정)</span>}</span><span className={styles.meta}>개념 {topic.concepts} · 문제 {topic.problems}</span></div>
            {topic.lessons.length > 0 && <ul className={styles.lessons}>{topic.lessons.map(lesson => <LessonChip key={lesson.id} lesson={lesson} />)}</ul>}
          </li>)}</ul>
        </div>)}
      </details>)}
    </section>;
  } catch (error) { return <section className={styles.page}><h1>전체 커리큘럼</h1><p role="alert">{runtimeError(error, 'admin.curriculum')}</p></section>; }
}
