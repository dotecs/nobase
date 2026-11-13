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

it('admin curriculum page shows the subject tree with lesson status and pack numbers', async () => {
  const html = renderToStaticMarkup(await CurriculumPage());
  for (const subject of ['수학 기초', '기본 함수', '대수와 기하', '미분법', '적분법', '선형대수학', '다변수미적분', '공학수학', '확률과 통계']) expect(html).toContain(subject);
  expect(html).toContain('소단원 3/239에 강의 3개');
  expect(html).toContain('>15강<');
  expect(html).toContain('미편성');
  expect(html).toContain('/learn/lesson/rm-22-w1?draft=1');
  // 강의가 없는 과목은 접혀 있어 대단원이 그려지지 않는다
  expect(html).not.toContain('함수의 극한과 연속');
});
