import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const rows = [
  { id: 'rm-15', version: 2, title: '함수의 관계식과 그래프', kind: 'concept', status: 'reviewed' },
  { id: 'rm-22-1', version: 1, title: '이차함수의 그래프', kind: 'concept', status: 'reviewed' },
  { id: 'rm-22-w1', version: 1, title: '문제풀이: 평행이동한 포물선이 x축에 접할 조건', kind: 'worked', status: 'draft' },
];
vi.mock('@/lib/learn/runtime', () => ({ requireCoach: vi.fn(async () => ({})), runtimeError: (error: unknown) => String(error) }));
vi.mock('@/lib/learn/lessons/data', () => ({ lessonDb: () => ({ from: () => ({ select: () => ({ order: () => ({ order: async () => ({ data: rows, error: null }) }) }) }) }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
import CurriculumPage from '@/app/(admin)/admin/learn/curriculum/page';

it('admin curriculum page lists every subject with lesson status and pack placement', async () => {
  const html = renderToStaticMarkup(await CurriculumPage());
  for (const subject of ['수학 기초', '기본 함수', '대수와 기하', '미분법', '적분법', '선형대수학', '다변수미적분', '공학수학', '확률과 통계']) expect(html).toContain(subject);
  expect(html).toContain('과목 9 · 대단원 61 · 소단원 239');
  expect(html).toContain('뿌리깊은수학 15강');
  expect(html).toContain('팩 없음 — 학습자에게 보이지 않음');
  expect(html).toContain('/learn/lesson/rm-22-w1?draft=1');
  expect(html).toContain('등록되지 않은 강의: rm-01');
});
