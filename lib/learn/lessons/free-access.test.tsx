import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/lib/learn/access', () => ({ hasLearnAccess: vi.fn() }));
import { FREE_LESSON_IDS, FREE_GUEST_LESSON_ID, isFreeLesson, isGuestLesson, lessonLoginHref } from './free-access';
import { StudioComplete } from '@/components/studio/StudioComplete';

describe('free lesson access', () => {
  it('opens all root-math lessons, first one without login', () => {
    expect(FREE_LESSON_IDS).toHaveLength(20);
    expect(FREE_GUEST_LESSON_ID).toBe('rm-01');
    expect(isGuestLesson('rm-01')).toBe(true);
    expect(isGuestLesson('rm-02')).toBe(false);
    expect(isFreeLesson('rm-20')).toBe(true);
    expect(isFreeLesson('other-01')).toBe(false);
    expect(lessonLoginHref('rm-02')).toBe('/login?returnTo=%2Flearn%2Flesson%2Frm-02');
  });
  it('completion dialog shows coaching CTA instead of practice for free viewers', () => {
    const props = { open: true, seen: 1, total: 1, elapsed: 0, gaps: [], next: { href: '/x', label: '다음 강의' }, onClose: () => {}, onProceed: async () => {} };
    expect(renderToStaticMarkup(<StudioComplete {...props} cta={{ label: '코칭 상담하기', href: 'https://talk.naver.com/w4jod1' }} />)).toContain('코칭 상담하기');
  });
});
