import type { Curriculum } from './curriculum';
import type { Lesson } from './schema';
import { lessonEntry } from './packs';

/**
 * 강 번호 참조. 강 번호는 팩마다 다르므로 대본에 숫자로 적지 않고 표시만 둔다.
 *   {{강:rm-15|함수의 관계식과 그래프}}       → 팩에 있으면 "15강 함수의 관계식과 그래프", 없으면 "함수의 관계식과 그래프"
 *   {{강:rm-15|함수의 관계식과 그래프|번호}}  → 팩에 있으면 "15강", 없으면 "함수의 관계식과 그래프"
 *   {{강:self|...}}                            → 지금 보고 있는 강의
 * 화면(필기·무대·머리글)에만 쓴다. 음성 대본(narration text/tts)은 미리 녹음되므로 번호 없이 단원명만 말한다.
 */
export const LESSON_REF = /\{\{강:([A-Za-z0-9._-]+)\|([^|{}]+)(?:\|(번호))?\}\}/g;
export const hasLessonRef = (text: string) => { LESSON_REF.lastIndex = 0; return LESSON_REF.test(text); };

export function resolveRefText(text: string, pack: Curriculum | undefined, selfId: string): string {
  return text.replace(LESSON_REF, (_, id: string, name: string, short?: string) => {
    const entry = lessonEntry(pack, id === 'self' ? selfId : id);
    if (!entry) return name.trim();
    return short ? `${entry.no}강` : `${entry.no}강 ${name.trim()}`;
  });
}

/** 머리글 "12강 · 함수의 정의"의 번호는 이 강의의 팩 번호로 바꾸고, 팩 밖에서는 번호를 뗀다. */
const EYEBROW_NO = /^\s*\d+강(?:-\d+)?\s*·\s*/;
export function resolveEyebrow(eyebrow: string, pack: Curriculum | undefined, selfId: string): string {
  const text = resolveRefText(eyebrow, pack, selfId);
  if (!EYEBROW_NO.test(text)) return text;
  const entry = lessonEntry(pack, selfId), rest = text.replace(EYEBROW_NO, '');
  return entry ? `${entry.no}강 · ${rest}` : rest;
}

type Json = unknown;
const walk = (value: Json, fn: (text: string) => string): Json =>
  typeof value === 'string' ? fn(value)
    : Array.isArray(value) ? value.map(entry => walk(entry, fn))
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, walk(entry, fn)]))
    : value;

/** 보는 사람의 팩 기준으로 강 번호 참조를 풀어 준 강의. id와 음성 대본(text·tts)은 건드리지 않아 음성 해시가 바뀌지 않는다. */
export function resolveLessonRefs(lesson: Lesson, pack: Curriculum | undefined): Lesson {
  const fn = (text: string) => resolveRefText(text, pack, lesson.id);
  return { ...lesson, scenes: lesson.scenes.map(scene => ({
    ...scene,
    headline: scene.headline ? { ...(walk(scene.headline, fn) as typeof scene.headline), ...(scene.headline.eyebrow ? { eyebrow: resolveEyebrow(scene.headline.eyebrow, pack, lesson.id) } : {}) } : scene.headline,
    stage: walk(scene.stage, fn) as typeof scene.stage,
    narration: scene.narration.map(sentence => sentence.cue ? { ...sentence, cue: walk(sentence.cue, fn) as typeof sentence.cue } : sentence),
  })) } as Lesson;
}

/** 검사 도구용: 음성 대본에 들어간 참조 표시(읽을 수 없다)를 찾는다. */
export function narrationRefs(lesson: Lesson): string[] {
  return lesson.scenes.flatMap(scene => scene.narration.filter(sentence => hasLessonRef(sentence.text) || hasLessonRef(sentence.tts ?? '')).map(sentence => `${scene.id}/${sentence.id}`));
}
