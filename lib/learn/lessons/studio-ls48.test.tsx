import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { memoArrowStart, rotatedMemoBounds } from './chalk';
import { lessonSchema, validateLesson, type Scene } from './schema';
import { studioDemo } from './studio-demo';
import { stageStateAt } from './stage-state-at';
import { StudioViewer } from '@/components/studio/StudioViewer';
import { StudioStage } from '@/components/studio/stages/StudioStage';

it.each([24, 70, 180])('starts the right-facing arrow next to measured %ipx text', width => {
  const box = rotatedMemoBounds({ left: 100, top: 80, width, height: 36 }, { x: 100, y: 106 }, 0);
  expect(memoArrowStart(box, { x: 500, y: 98 })).toEqual({ x: 100 + width + 8, y: 98 });
});

it('uses the nearest measured edge for left, above and below targets', () => {
  const box = rotatedMemoBounds({ left: 100, top: 80, width: 70, height: 36 }, { x: 100, y: 106 }, 0);
  expect(memoArrowStart(box, { x: 0, y: 98 })).toEqual({ x: 92, y: 98 });
  expect(memoArrowStart(box, { x: 135, y: 0 })).toEqual({ x: 135, y: 72 });
  expect(memoArrowStart(box, { x: 135, y: 500 })).toEqual({ x: 135, y: 124 });
});

it('accounts for centered multiline text rotation and keeps its arrow outside the bbox', () => {
  const box = rotatedMemoBounds({ left: 150, top: 100, width: 100, height: 70 }, { x: 200, y: 126 }, -10);
  expect(box.right - box.left).toBeGreaterThan(100);
  expect(box.bottom - box.top).toBeGreaterThan(70);
  expect(memoArrowStart(box, { x: 600, y: box.y }).x).toBeCloseTo(box.right + 8);
});

const figure: Scene = {
  id: 'square', title: '정사각형의 넓이', tag: 'define',
  stage: { type: 'figure', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect x="100" y="100" width="200" height="200"/></svg>', caption: '정사각형', items: [{ id: 'area', tex: 'a^2', position: { x: .5, y: .5 } }] },
  narration: [{ id: 'square-1', role: 'say', text: '정사각형의 넓이는 한 변의 길이를 두 번 곱해요.', cue: { actions: [
    { type: 'circle', target: 'item:area' },
    { type: 'handwrite', position: { x: .15, y: .5 }, text: '넓이', arrow_to: { target: 'item:area' } },
    { type: 'pointer', position: { x: .3, y: .3 } },
  ] } }],
};

it('accepts figure items and ratio-based chalk, including without items', () => {
  expect(lessonSchema.safeParse({ ...studioDemo, scenes: [figure] }).success).toBe(true);
  const plain = { ...figure, stage: { type: 'figure', image_path: '/square.webp', caption: '정사각형' }, narration: [{ id: 's', role: 'say', text: '그림', cue: { actions: [{ type: 'pointer', position: { x: .2, y: .2 } }] } }] };
  expect(lessonSchema.safeParse({ ...studioDemo, scenes: [plain] }).success).toBe(true);
  expect(lessonSchema.safeParse({ ...studioDemo, scenes: [{ ...plain, narration: [{ id: 's', role: 'say', text: '그림', cue: { actions: [{ type: 'pointer', position: { x: 2, y: .2 } }] } }] }] }).success).toBe(false);
});

it('renders the figure image, item and chalk overlay through StudioViewer', () => {
  const html = renderToStaticMarkup(<StudioViewer lesson={{ ...studioDemo, scenes: [figure] }} />);
  expect(html).toContain('alt="정사각형"');
  expect(html).toContain('data-canvas="true"');
  expect(html).toContain('data-stage-target="item:area"');
  expect(html).toContain('data-chalk="handwrite"');
  expect(html).toContain('data-chalk="pointer"');
  expect(html).toContain('katex');
});

it('preserves figure item hiding and reveal while checking nonexistent targets', () => {
  const scene: Scene = { ...figure, stage: { ...figure.stage, initial: { hidden_items: ['area'] } } as Scene['stage'], narration: [{ id: 's', role: 'say', text: '넓이', cue: { actions: [{ type: 'reveal', target: 'item', id: 'area', at_ms: 500 }] } }] };
  expect(stageStateAt(scene, 0, [0]).revealed.item).toEqual([]);
  expect(stageStateAt(scene, 625, [0]).itemOpacity?.area).toBe(.5);
  expect(lessonSchema.safeParse({ ...studioDemo, scenes: [{ ...figure, narration: [{ id: 's', role: 'say', text: '넓이', cue: { actions: [{ type: 'circle', target: 'item:absent' }] } }] }] }).success).toBe(false);
});

it('renders table header math exactly like body cells and validates authored TeX', () => {
  const scene: Scene = { id: 'table', title: '지수법칙', tag: 'define', stage: { type: 'table', columns: ['나눗셈 $a^m \\div a^n$', '결과'], rows: [{ cells: ['$a^{m-n}$', '설명'] }] }, narration: [{ id: 's', role: 'say', text: '지수법칙', cue: { row: 0 } }] };
  const html = renderToStaticMarkup(<StudioStage scene={scene} state={stageStateAt(scene, 0, [0])} onWhy={() => {}} onTrace={() => {}} onQuiz={() => {}} />);
  expect(html.match(/<th[\s\S]*?<\/th>/)?.[0]).toContain('katex');
  expect(html).not.toContain('$a^m');
  expect(html).toContain('결과');
  expect(() => validateLesson({ ...studioDemo, scenes: [scene] }, new Set())).not.toThrow();
  expect(() => validateLesson({ ...studioDemo, scenes: [{ ...scene, stage: { ...scene.stage, columns: ['$\\badcommand$', '결과'] } }] }, new Set())).toThrow();
});
