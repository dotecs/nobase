import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { PACKS, packById, packForLesson, packsWithLesson, lessonEntry, guestLessonIds, packLessonIds } from './packs';
import { resolveRefText, resolveEyebrow, resolveLessonRefs, narrationRefs } from './lesson-refs';
import { lessonSchema, type Lesson } from './schema';
import type { Curriculum } from './curriculum';

const free = packById('free-root-math')!;
/** 같은 강의가 다른 번호를 갖는 가상의 두 번째 팩 */
const other: Curriculum = { id: 'other', title: '다른 팩', chapters: [{ no: 1, title: '함수', items: [
  { no: 42, title: '함수의 관계식과 그래프', lesson_id: 'rm-15', worked: [{ title: '문제풀이', lesson_id: 'rm-15-w1' }] },
] }] };

describe('packs', () => {
  it('the free pack holds lessons 1 to 20 and opens the first five to guests', () => {
    expect(free.access).toEqual({ kind: 'free', guest_count: 5 });
    expect(packLessonIds(free)).toHaveLength(20);
    expect(guestLessonIds(free)).toEqual(['rm-01', 'rm-02', 'rm-03', 'rm-04', 'rm-05']);
  });
  it('pack ids are unique and every registered pack file is listed', () => {
    expect(new Set(PACKS.map(pack => pack.id)).size).toBe(PACKS.length);
    expect(readdirSync('content/packs').filter(name => name.endsWith('.json')).map(name => JSON.parse(readFileSync('content/packs/' + name, 'utf8')).id).sort()).toEqual(PACKS.map(pack => pack.id).sort());
  });
  it('lessons outside every pack belong to no pack', () => {
    expect(packsWithLesson('rm-22-1')).toEqual([]);
    expect(packForLesson('rm-22-1')).toBeUndefined();
    expect(packForLesson('rm-15', 'no-such-pack')?.id).toBe('free-root-math');
  });
  it('lesson numbers come from the pack; worked lessons take their parent number', () => {
    expect(lessonEntry(free, 'rm-15')).toEqual({ no: 15, title: '함수의 관계식과 그래프' });
    expect(lessonEntry(other, 'rm-15')?.no).toBe(42);
    expect(lessonEntry(other, 'rm-15-w1')).toEqual({ no: 42, title: '문제풀이' });
    expect(lessonEntry(free, 'rm-22-1')).toBeUndefined();
  });
});

describe('lesson number references', () => {
  const token = '앞에서 본 {{강:rm-15|함수의 관계식과 그래프}}';
  it('shows the number of the pack being viewed, or only the name outside it', () => {
    expect(resolveRefText(token, free, 'rm-16')).toBe('앞에서 본 15강 함수의 관계식과 그래프');
    expect(resolveRefText(token, other, 'rm-16')).toBe('앞에서 본 42강 함수의 관계식과 그래프');
    expect(resolveRefText(token, undefined, 'rm-16')).toBe('앞에서 본 함수의 관계식과 그래프');
    expect(resolveRefText('{{강:rm-15|함수의 관계식과 그래프|번호}}', free, 'rm-16')).toBe('15강');
    expect(resolveRefText('{{강:rm-15|함수의 관계식과 그래프|번호}}', undefined, 'rm-16')).toBe('함수의 관계식과 그래프');
    expect(resolveRefText('{{강:self|상수함수}}', free, 'rm-20')).toBe('20강 상수함수');
  });
  it('renumbers the headline eyebrow and leaves scene labels alone', () => {
    expect(resolveEyebrow('15강 · 함수의 관계식과 그래프', other, 'rm-15')).toBe('42강 · 함수의 관계식과 그래프');
    expect(resolveEyebrow('22강-1 · 이차함수의 그래프', free, 'rm-22-1')).toBe('이차함수의 그래프');
    expect(resolveEyebrow('확인', free, 'rm-15')).toBe('확인');
  });
  it('resolves stage, headline and cue text but never ids or narration', () => {
    const raw = JSON.parse(readFileSync('content/lessons/rm-16.json', 'utf8'));
    raw.scenes[0].narration[0].cue = { ...(raw.scenes[0].narration[0].cue ?? {}), highlight: '{{강:rm-15|함수의 관계식과 그래프}}' };
    const lesson = lessonSchema.parse(raw) as Lesson, shown = resolveLessonRefs(lesson, other);
    expect(shown.scenes[0].narration[0].cue?.highlight).toBe('42강 함수의 관계식과 그래프');
    expect(shown.scenes[0].headline?.eyebrow).toBe('방정식과 부등식의 의미');
    expect(shown.scenes.map(scene => scene.id)).toEqual(lesson.scenes.map(scene => scene.id));
    expect(shown.scenes.flatMap(scene => scene.narration.map(s => [s.id, s.text, s.tts]))).toEqual(lesson.scenes.flatMap(scene => scene.narration.map(s => [s.id, s.text, s.tts])));
    expect(narrationRefs(lesson)).toEqual([]);
  });
  it('in the free pack the existing lessons look exactly as authored', () => {
    for (const id of packLessonIds(free)) {
      const lesson = lessonSchema.parse(JSON.parse(readFileSync(`content/lessons/${id}.json`, 'utf8'))) as Lesson;
      expect(resolveLessonRefs(lesson, free)).toEqual(lesson);
    }
  });
  it('rejects a reference inside narration, which cannot be spoken', () => {
    const raw = JSON.parse(readFileSync('content/lessons/rm-16.json', 'utf8'));
    raw.scenes[0].narration[0].text += ' {{강:rm-15|함수의 관계식과 그래프}}';
    expect(lessonSchema.safeParse(raw).success).toBe(false);
  });
});

import { buildCatalog, lessonStates, MASTER, LESSON_TOPICS } from './master';
describe('master curriculum', () => {
  it('covers every subject and maps lessons only to topics that exist', () => {
    expect(MASTER).toHaveLength(9);
    const keys = new Set(MASTER.flatMap(s => s.units.flatMap(u => u.topics.map(t => t.key))));
    for (const [id, topics] of Object.entries(LESSON_TOPICS)) for (const key of topics) expect(keys.has(key), `${id} → ${key}`).toBe(true);
    for (const id of packLessonIds(free)) expect(LESSON_TOPICS[id], id).toBeTruthy();
  });
  it('shows the latest version, the version learners see, and pack placement', () => {
    const states = lessonStates([
      { id: 'rm-02', version: 8, title: '문자와 식', kind: 'concept', status: 'reviewed' }, { id: 'rm-02', version: 9, title: '문자와 식', kind: 'concept', status: 'draft' },
      { id: 'rm-22-1', version: 1, title: '이차함수의 그래프', kind: 'concept', status: 'reviewed' }, { id: 'x-1', version: 1, title: '미분류', kind: 'concept', status: 'retired' },
      { id: 'x-2', version: 1, title: '소단원 없음', kind: 'concept', status: 'draft' },
    ]);
    expect(states.map(s => [s.id, s.version, s.status, s.published])).toEqual([['rm-02', 9, 'draft', 8], ['rm-22-1', 1, 'reviewed', 1], ['x-2', 1, 'draft', null]]);
    const catalog = buildCatalog(states), topic = (key: string) => catalog.subjects.flatMap(s => s.units.flatMap(u => u.topics)).find(t => t.key === key)!;
    expect(topic('basic.expr').lessons[0].packs).toEqual([{ id: 'free-root-math', title: '뿌리깊은수학', no: 2 }]);
    expect(topic('quad.graph').lessons[0].packs).toEqual([]);
    expect(catalog.unplaced.map(l => l.id)).toEqual(['x-2']);
    expect(catalog.totals).toMatchObject({ subjects: 9, units: 61, topics: 239, lessons: 3, inPack: 1 });
  });
});

import { adminCurriculum as adminList, lessonStates as statesOf } from './master';
import { nextLessonAction as nextAction } from './curriculum';
describe('관리자용 목차', () => {
  const states = statesOf([
    { id: 'rm-01', version: 1, title: '수의 체계', kind: 'concept', status: 'live' },
    { id: 'rm-22-1', version: 1, title: '이차함수의 그래프', kind: 'concept', status: 'reviewed' },
    { id: 'rm-22-w1', version: 3, title: '문제풀이: 접할 조건', kind: 'worked', status: 'draft' },
    { id: 'zz-1', version: 1, title: '어디에도 없는 강의', kind: 'concept', status: 'draft' },
  ]);
  it('팩의 목차 뒤에 팩 밖 강의를 대단원별로 붙이고, 문제풀이는 개념 강의 아래에 둔다', () => {
    const list = adminList(states), pack = PACKS[0];
    expect(list.chapters.slice(0, pack.chapters.length).map(chapter => chapter.title)).toEqual(pack.chapters.map(chapter => chapter.title));
    expect(list.chapters.map(chapter => chapter.no)).toEqual(list.chapters.map((_, index) => index + 1));
    const extra = list.chapters.slice(pack.chapters.length);
    const quad = extra.find(chapter => chapter.items.some(item => item.lesson_id === 'rm-22-1'))!;
    expect(quad.items).toEqual([{ no: 0, title: '이차함수의 그래프', lesson_id: 'rm-22-1', worked: [{ title: '문제풀이: 접할 조건 (초안)', lesson_id: 'rm-22-w1' }] }]);
    expect(extra.at(-1)).toMatchObject({ title: '소단원 미지정', items: [{ lesson_id: 'zz-1', no: 0 }] });
    expect(extra.flatMap(chapter => chapter.items).some(item => item.lesson_id === 'rm-01')).toBe(false);
  });
  it('미리보기 목차의 다음 강의 링크는 미리보기로 이어진다', () => {
    const list = adminList(states);
    expect(nextAction({ curriculum: list, available: states.map(state => state.id), query: 'draft=1' }, 'rm-22-1').href).toBe('/learn/lesson/rm-22-w1?autoplay=1&draft=1');
  });
});
