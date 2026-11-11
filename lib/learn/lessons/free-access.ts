import root from '@/content/curricula/root-math.json';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import { curriculumIds, type Curriculum } from './curriculum';

/** 무료 공개 강의: 뿌리깊은수학 전 강의. 첫 강의는 비로그인, 나머지는 로그인(카카오) 후. */
export const FREE_LESSON_IDS: readonly string[] = curriculumIds(root as Curriculum);
export const FREE_GUEST_LESSON_ID = FREE_LESSON_IDS[0];
export const COACHING_CTA = { label: '코칭 상담하기', href: 'https://talk.naver.com/w4jod1' } as const;
export const isFreeLesson = (id: string) => FREE_LESSON_IDS.includes(id);
export const isGuestLesson = (id: string) => id === FREE_GUEST_LESSON_ID;

export type LessonViewer =
  | { kind: 'full'; userId: string; admin: boolean }
  | { kind: 'free'; userId: string }
  | { kind: 'guest' }
  | { kind: 'login' }
  | { kind: 'denied' };

/** 강의를 볼 수 있는지와 어떤 자격으로 보는지 결정한다. 수강생·관리자는 기존과 같다. */
export async function lessonViewer(lessonId: string): Promise<LessonViewer> {
  const client = await createServerSupabaseClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return isGuestLesson(lessonId) ? { kind: 'guest' } : isFreeLesson(lessonId) ? { kind: 'login' } : { kind: 'denied' };
  const access = await hasLearnAccess(user.id);
  if (access.granted) return { kind: 'full', userId: user.id, admin: access.reason === 'admin' };
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
