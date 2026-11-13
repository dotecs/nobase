import { createServerSupabaseClient } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import { freePacks, guestLessonIds, packLessonIds, packsWithLesson } from './packs';

/** 무료 공개 강의: 접근 규칙이 free인 팩(content/packs)에 든 강의. 팩마다 앞 guest_count강은 비로그인, 나머지는 로그인(카카오) 후. */
export const FREE_LESSON_IDS: readonly string[] = [...new Set(freePacks().flatMap(packLessonIds))];
export const FREE_GUEST_LESSON_IDS: readonly string[] = [...new Set(freePacks().flatMap(guestLessonIds))];
export const FREE_GUEST_COUNT = FREE_GUEST_LESSON_IDS.length;
export const FREE_GUEST_LESSON_ID = FREE_LESSON_IDS[0];
export const COACHING_CTA = { label: '코칭 상담하기', href: 'https://talk.naver.com/w4jod1' } as const;
export const isFreeLesson = (id: string) => FREE_LESSON_IDS.includes(id);
export const isGuestLesson = (id: string) => FREE_GUEST_LESSON_IDS.includes(id);
/** 비로그인 시청자가 이 강의 다음으로 넘어갈 때 로그인이 필요한지 */
export const nextNeedsLogin = (id: string) => { const next = FREE_LESSON_IDS[FREE_LESSON_IDS.indexOf(id) + 1]; return Boolean(next) && !isGuestLesson(next); };

export type LessonViewer =
  | { kind: 'full'; userId: string; admin: boolean }
  | { kind: 'free'; userId: string }
  | { kind: 'guest' }
  | { kind: 'login' }
  /** 수강 권한이 없다(코칭 과정 등록 안내) */
  | { kind: 'denied' }
  /** 수강생이지만 이 강의가 어느 팩에도 없다(제작·검수 중인 강의). 없는 강의로 취급한다. */
  | { kind: 'hidden' };

/**
 * 강의를 볼 수 있는지와 어떤 자격으로 보는지 결정한다.
 * 학습자에게는 팩에 든 강의만 열린다. 팩에 넣지 않은 강의는 상태가 reviewed여도 관리자만 본다.
 */
export async function lessonViewer(lessonId: string): Promise<LessonViewer> {
  const client = await createServerSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return isGuestLesson(lessonId) ? { kind: 'guest' } : isFreeLesson(lessonId) ? { kind: 'login' } : { kind: 'denied' };
  const access = await hasLearnAccess(user.id);
  if (access.granted && access.reason === 'admin') return { kind: 'full', userId: user.id, admin: true };
  if (access.granted) return packsWithLesson(lessonId).length ? { kind: 'full', userId: user.id, admin: false } : { kind: 'hidden' };
  return isFreeLesson(lessonId) ? { kind: 'free', userId: user.id } : { kind: 'denied' };
}

/** 로그인 사용자 id(수강생이거나 무료 강의를 보는 사람). 비로그인이면 null. */
export async function lessonUserId(lessonId?: string): Promise<string | null> {
  const client = await createServerSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  if (lessonId && isFreeLesson(lessonId)) return user.id;
  return (await hasLearnAccess(user.id)).granted ? user.id : null;
}

export const lessonLoginHref = (lessonId: string) => `/login?returnTo=${encodeURIComponent('/learn/lesson/' + lessonId)}`;
