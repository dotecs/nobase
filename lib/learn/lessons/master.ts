import master from '@/content/curricula/master.json';
import lessonTopics from '@/content/curricula/lesson-topics.json';
import { PACKS, lessonEntry } from './packs';

/** 전 과목 마스터 목록: 과목 → 대단원 → 소단원. 강 번호가 없다(번호는 팩이 정한다). */
export type MasterTopic = { key: string; title: string; planned: boolean; concepts: number; problems: number };
export type MasterUnit = { id: string; no: number; title: string; topics: MasterTopic[] };
export type MasterSubject = { id: string; title: string; optional: boolean; units: MasterUnit[] };
export const MASTER: readonly MasterSubject[] = master.subjects;
export const LESSON_TOPICS: Readonly<Record<string, string[]>> = lessonTopics.lessons;

export type LessonState = { id: string; title: string; kind: string; /** 가장 최신 판 */ version: number; status: string; /** 학습자에게 보이는 판(reviewed·live). 없으면 null */ published: number | null };
export type CatalogLesson = LessonState & { packs: { id: string; title: string; no: number }[] };
export type CatalogTopic = MasterTopic & { lessons: CatalogLesson[] };
export type Catalog = {
  subjects: (Omit<MasterSubject, 'units'> & { units: (Omit<MasterUnit, 'topics'> & { topics: CatalogTopic[] })[]; topics: number; covered: number })[];
  /** 소단원에 붙지 않은 강의(lesson-topics.json에 없거나 없는 소단원을 가리킴) */
  unplaced: CatalogLesson[];
  totals: { subjects: number; units: number; topics: number; covered: number; lessons: number; inPack: number };
};

/** 판 목록(같은 id가 여러 줄)을 강의별 최신 판과 공개 판으로 줄인다. 폐기한 판은 뺀다. */
export function lessonStates(rows: { id: string; version: number; title: string; kind: string; status: string }[]): LessonState[] {
  const byId = new Map<string, LessonState>();
  for (const row of [...rows].filter(r => r.status !== 'retired').sort((a, b) => a.version - b.version)) {
    const published = row.status === 'reviewed' || row.status === 'live' ? row.version : byId.get(row.id)?.published ?? null;
    byId.set(row.id, { id: row.id, title: row.title, kind: row.kind, version: row.version, status: row.status, published });
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/** 마스터 목록에 강의 제작 상태와 팩 편성을 얹는다. */
export function buildCatalog(lessons: LessonState[]): Catalog {
  const withPacks = (lesson: LessonState): CatalogLesson => ({ ...lesson, packs: PACKS.flatMap(pack => { const entry = lessonEntry(pack, lesson.id); return entry ? [{ id: pack.id, title: pack.title, no: entry.no }] : []; }) });
  const all = lessons.map(withPacks), known = new Set(MASTER.flatMap(s => s.units.flatMap(u => u.topics.map(t => t.key))));
  const subjects = MASTER.map(subject => {
    const units = subject.units.map(unit => ({ ...unit, topics: unit.topics.map(topic => ({ ...topic, lessons: all.filter(lesson => LESSON_TOPICS[lesson.id]?.includes(topic.key)) })) }));
    const topics = units.flatMap(unit => unit.topics);
    return { ...subject, units, topics: topics.length, covered: topics.filter(topic => topic.lessons.length).length };
  });
  return {
    subjects, unplaced: all.filter(lesson => !(LESSON_TOPICS[lesson.id] ?? []).some(key => known.has(key))),
    totals: { subjects: subjects.length, units: subjects.reduce((n, s) => n + s.units.length, 0), topics: subjects.reduce((n, s) => n + s.topics, 0), covered: subjects.reduce((n, s) => n + s.covered, 0), lessons: all.length, inPack: all.filter(lesson => lesson.packs.length).length },
  };
}
