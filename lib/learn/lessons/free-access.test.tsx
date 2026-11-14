import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/lib/learn/access', () => ({ hasLearnAccess: vi.fn() }));
import { FREE_LESSON_IDS, FREE_GUEST_LESSON_ID, FREE_GUEST_LESSON_IDS, isFreeLesson, isGuestLesson, nextNeedsLogin, lessonLoginHref } from './free-access';
import { StudioComplete } from '@/components/studio/StudioComplete';

describe('free lesson access', () => {
  it('opens all root-math lessons, first five without login', () => {
    expect(FREE_LESSON_IDS).toHaveLength(24);
    expect(FREE_GUEST_LESSON_ID).toBe('rm-01');
    expect(isGuestLesson('rm-01')).toBe(true);
    expect(isGuestLesson('rm-05')).toBe(true);
    expect(isGuestLesson('rm-06')).toBe(false);
    expect(nextNeedsLogin('rm-04')).toBe(false);
    expect(nextNeedsLogin('rm-05')).toBe(true);
    expect(nextNeedsLogin('rm-20')).toBe(true);
    expect(nextNeedsLogin('rm-22-w1')).toBe(false);
    expect(isFreeLesson('rm-22-w1')).toBe(true);
    expect(isFreeLesson('rm-20')).toBe(true);
    expect(isFreeLesson('other-01')).toBe(false);
    expect(lessonLoginHref('rm-06')).toBe('/login?returnTo=%2Flearn%2Flesson%2Frm-06');
  });
  it('completion dialog shows coaching CTA instead of practice for free viewers', () => {
    const props = { open: true, seen: 1, total: 1, elapsed: 0, gaps: [], next: { href: '/x', label: '다음 강의' }, onClose: () => {}, onProceed: async () => {} };
    expect(renderToStaticMarkup(<StudioComplete {...props} cta={{ label: '코칭 상담하기', href: 'https://talk.naver.com/w4jod1' }} />)).toContain('코칭 상담하기');
  });
});

import { readFileSync } from 'node:fs';
it('middleware lets guests open exactly the guest lessons', () => {
  const src = readFileSync('lib/supabase-middleware.ts', 'utf8');
  for (const id of FREE_GUEST_LESSON_IDS) expect(src).toContain(`'/learn/lesson/${id}'`);
  expect(src).not.toContain(`'/learn/lesson/${FREE_LESSON_IDS[FREE_GUEST_LESSON_IDS.length]}'`);
});

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { hasLearnAccess } from '@/lib/learn/access';
import { lessonViewer } from './free-access';
describe('who sees a lesson', () => {
  const as = (user: { id: string } | null, access?: { granted: boolean; reason: string }) => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user } }) } } as never);
    vi.mocked(hasLearnAccess).mockResolvedValue((access ?? { granted: false, reason: 'not_enrolled' }) as never);
  };
  it('learners only see lessons that are in a pack', async () => {
    as(null); expect(await lessonViewer('rm-01')).toEqual({ kind: 'guest' }); expect(await lessonViewer('rm-06')).toEqual({ kind: 'login' }); expect(await lessonViewer('rm-11-w1')).toEqual({ kind: 'denied' });
    as({ id: 'u' }); expect(await lessonViewer('rm-20')).toEqual({ kind: 'free', userId: 'u' }); expect(await lessonViewer('rm-11-w1')).toEqual({ kind: 'denied' });
    as({ id: 'u' }, { granted: true, reason: 'enrolled' }); expect(await lessonViewer('rm-20')).toEqual({ kind: 'full', userId: 'u', admin: false }); expect(await lessonViewer('rm-11-w1')).toEqual({ kind: 'hidden' });
  });
  it('admins see every lesson, including ones outside all packs', async () => {
    as({ id: 'a' }, { granted: true, reason: 'admin' }); expect(await lessonViewer('rm-11-w1')).toEqual({ kind: 'full', userId: 'a', admin: true });
  });
});
