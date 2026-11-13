import freeRootMath from '@/content/packs/free-root-math.json';
import { curriculumIds, type Curriculum } from './curriculum';

/**
 * 팩 = 상품 단위. 전 과목 마스터(content/curricula/master.json)에서 강의를 골라 순서대로 늘어놓은 목록과 접근 규칙이다.
 * 강 번호는 강의가 아니라 팩이 정한다(같은 강의가 팩마다 다른 번호를 가질 수 있다).
 * learn_* 테이블의 pack_id(root-math)는 문항·능력의 출처를 가리키는 옛 이름이고 이 팩과 다르다.
 */
export type PackAccess =
  | { kind: 'free'; /** 앞에서부터 이 개수만큼은 비로그인으로 본다 */ guest_count: number }
  | { kind: 'enrolled' };
export type LessonPack = Curriculum & { access: PackAccess };

/** 등록된 팩. 앞에 있는 팩이 우선한다(한 강의가 여러 팩에 있을 때의 기본 팩). */
export const PACKS: readonly LessonPack[] = [freeRootMath as LessonPack];

export const packById = (id: string | undefined) => PACKS.find(pack => pack.id === id);
export const packLessonIds = (pack: LessonPack) => curriculumIds(pack);
export const packsWithLesson = (lessonId: string) => PACKS.filter(pack => packLessonIds(pack).includes(lessonId));
export const freePacks = () => PACKS.filter(pack => pack.access.kind === 'free');
export const guestLessonIds = (pack: LessonPack) => pack.access.kind === 'free' ? packLessonIds(pack).slice(0, pack.access.guest_count) : [];

/** 이 강의를 볼 때 기준이 되는 팩. 주소로 지정한 팩에 강의가 있으면 그 팩, 아니면 강의가 든 첫 팩. */
export function packForLesson(lessonId: string, preferred?: string): LessonPack | undefined {
  const packs = packsWithLesson(lessonId);
  return packs.find(pack => pack.id === preferred) ?? packs[0];
}

/** 팩 안에서의 강 번호와 제목. 문제풀이 강의는 딸린 개념 강의의 번호를 쓴다. 팩에 없으면 undefined. */
export function lessonEntry(pack: Curriculum | undefined, lessonId: string): { no: number; title: string } | undefined {
  for (const chapter of pack?.chapters ?? []) for (const item of chapter.items) {
    if (item.lesson_id === lessonId) return { no: item.no, title: item.title };
    const worked = item.worked?.find(entry => entry.lesson_id === lessonId);
    if (worked) return { no: item.no, title: worked.title };
  }
  return undefined;
}
