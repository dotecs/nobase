import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { boxAnchor, targetAnchor, arrowEndpoints } from './pointing';
import { labelBox, defaultLabelBox, overlaps, placePointLabels, type PointLabel } from './point-labels';
import { containedImageBox, figureSpace } from './figure-space';
import { lessonSchema } from './schema';
import { studioDemo } from './studio-demo';
import { stageStateAt } from './stage-state-at';
import { LessonText } from '@/components/learn/lesson/LessonText';
import { nextLessonAction, type CurriculumView } from './curriculum';
import { readFileSync } from 'node:fs';

const box = labelBox(100, 100, 80, 40);
it.each([
  ['center', { x: 140, y: 120 }], ['top', { x: 140, y: 96 }], ['bottom', { x: 140, y: 144 }],
  ['left', { x: 96, y: 120 }], ['right', { x: 184, y: 120 }], ['edge', { x: 184, y: 120 }],
] as const)('places the %s arrow anchor four pixels outside its boundary', (anchor, expected) => {
  expect(boxAnchor(box, { x: 300, y: 120 }, anchor)).toEqual(expected);
});
it('keeps diagonal edge padding at four pixels and point padding at radius six plus three', () => {
  const anchor = boxAnchor(box, { x: 220, y: 160 });
  expect(Math.hypot(anchor.x - box.right, anchor.y - box.bottom)).toBeCloseTo(4);
  const space = { sx: (x: number) => x, sy: (y: number) => y, x: [0, 400] as [number, number], y: [0, 300] as [number, number], target: () => box };
  const point = targetAnchor('point:0', { x: 300, y: 120 }, space)!;
  expect(Math.hypot(point.x - box.x, point.y - box.y)).toBe(9);
  expect(targetAnchor('point:0', { x: 300, y: 120 }, space, 'center')).toEqual({ x: 140, y: 120 });
});
it('anchors both ends of target-based arrows while retaining explicit coordinates', () => {
  const space = { sx: (x: number) => x * 2, sy: (y: number) => y * 2, x: [0, 400] as [number, number], y: [0, 300] as [number, number], target: (id: string) => id === 'a' ? box : labelBox(300, 100, 80, 40) };
  expect(arrowEndpoints('a', 'b', space)).toEqual({ start: { x: 184, y: 120 }, end: { x: 296, y: 120 } });
  expect(arrowEndpoints({ x: 1, y: 2 }, { x: 3, y: 4 }, space)).toEqual({ start: { x: 2, y: 4 }, end: { x: 6, y: 8 } });
});

const label: PointLabel = { id: 'point:0', x: 100, y: 100, width: 40, height: 20 };
const viewport = labelBox(0, 0, 300, 300);
it('tries default, opposite, stack and nearest free leader placement deterministically', () => {
  const initial = defaultLabelBox(label, true), opposite = defaultLabelBox(label, true, 'n');
  const stack = labelBox(initial.left, initial.top + 26, 40, 20);
  expect(placePointLabels([label], [], viewport, true)[label.id].mode).toBe('default');
  expect(placePointLabels([label], [initial], viewport, true)[label.id].mode).toBe('opposite');
  expect(placePointLabels([label], [initial, opposite], viewport, true)[label.id].mode).toBe('stack');
  const obstacles = [initial, opposite, stack];
  const placed = placePointLabels([label], obstacles, viewport, true)[label.id];
  expect(placed.mode).toBe('leader');
  expect(obstacles.some(obstacle => overlaps(placed.box, obstacle))).toBe(false);
  expect(Math.hypot(placed.leader!.end.x - label.x, placed.leader!.end.y - label.y)).toBeCloseTo(8);
  expect(placePointLabels([label], obstacles, viewport, true)[label.id]).toEqual(placed);
});
it('uses southwest as the opposite graph position and keeps author offsets fixed', () => {
  const initial = defaultLabelBox(label, false);
  expect(placePointLabels([label], [initial], viewport, false)[label.id].box).toEqual(defaultLabelBox(label, false, 'sw'));
  const authored = { ...label, position: 's' as const, offset: { x: 7, y: 3 } };
  const fixed = defaultLabelBox(authored, true);
  const placed = placePointLabels([authored], [fixed], viewport, true)[label.id];
  expect(placed.box).toEqual(fixed);
  expect(placed.mode).toBe('authored');
  expect(placed.leader).toBeDefined();
  expect(placePointLabels([authored], [], viewport, true)[label.id].leader).toBeUndefined();
});
it('avoids other labels, tick numbers and points using immutable measured boxes', () => {
  const other = { ...label, id: 'point:1', x: 120 };
  const obstacles = [labelBox(110, 110, 20, 36), labelBox(92, 92, 16, 16)];
  const input = JSON.stringify([label, other, obstacles]);
  const placed = placePointLabels([label, other], obstacles, viewport, true);
  expect(overlaps(placed[label.id].box, placed[other.id].box)).toBe(false);
  expect(JSON.stringify([label, other, obstacles])).toBe(input);
});

it.each([{ left: 10, top: 20, width: 600, height: 400 }, { left: 10, top: 20, width: 300, height: 600 }])('maps normalized figure coordinates to the contained image, excluding letterboxing %j', element => {
  const image = containedImageBox(element, 400, 400)!;
  expect(image.right - image.left).toBe(Math.min(element.width, element.height));
  const space = figureSpace(image);
  expect(space.sx(0)).toBe(image.left);
  expect(space.sy(1)).toBe(image.bottom);
  expect(space.sx(.5)).toBe(element.left + element.width / 2);
  expect(space.sy(.5)).toBe(element.top + element.height / 2);
  expect(containedImageBox(element, 0, 0)).toBeNull();
});
it('accepts n/s, label offsets, tick targets and all arrow_to anchors without altering content', () => {
  const lesson = structuredClone(studioDemo);
  lesson.scenes[0].narration[0].cue = { actions: [
    { type: 'point', x: 1, y: 1, label: '1', label_pos: 'n', label_offset: { x: 4, y: -2 } },
    { type: 'handwrite', position: { x: 0, y: 1 }, text: '눈금', arrow_to: { target: 'tick:1', anchor: 'bottom' } },
  ] };
  const parsed = lessonSchema.parse(lesson);
  expect(parsed.scenes[0].narration[0].cue).toEqual(lesson.scenes[0].narration[0].cue);
  expect(stageStateAt(parsed.scenes[0], 0, [0, 3000, 6000]).points[0].label_offset).toEqual({ x: 4, y: -2 });
  const bad = JSON.parse(JSON.stringify(lesson).replace('"anchor":"bottom"', '"anchor":"unknown"'));
  expect(lessonSchema.safeParse(bad).success).toBe(false);
});
it('uses displaystyle fractions in authored table, quiz and why text', () => {
  const html = renderToStaticMarkup(<LessonText authored text={'설명 $\\frac{1}{2}$'} />);
  expect(html).toContain('\\displaystyle');
  expect(html).toContain('mfrac');
  expect(html).not.toContain('reset-size6 size3');
});
it('defines the typography ladder once and keeps fraction text at one em', () => {
  const css = readFileSync('components/studio/studio.module.css', 'utf8');
  for (const [name, size] of [['tick', 20], ['label', 23], ['hand', 28], ['item', 26]]) {
    expect(css).toContain('--studio-type-' + name + ':' + size + 'px');
  }
  expect(css).toContain('.katex .mfrac) { font-size:1em; }');
  expect(readFileSync('components/studio/graph.module.css', 'utf8')).toContain('var(--studio-type-label)');
  expect(readFileSync('components/studio/items.module.css', 'utf8')).toContain('var(--studio-type-item)');
  expect(readFileSync('components/studio/HandwrittenMark.tsx', 'utf8')).toContain('var(--studio-type-hand)');
});

const course: CurriculumView = { curriculum: { id: 'p', title: '과정', chapters: [{ no: 1, title: '단원', items: [
  { no: 1, title: '첫 강', lesson_id: 'one', worked: [{ title: '문제풀이', lesson_id: 'one-w1' }] },
  { no: 2, title: '다음 강', lesson_id: 'two' },
] }] }, available: ['one', 'one-w1', 'two'] };
it('prioritizes attached worked lessons, then the next lesson with first-scene autoplay', () => {
  expect(nextLessonAction(course, 'one')).toEqual({ label: '문제풀이로', href: '/learn/lesson/one-w1?autoplay=1', lessonId: 'one-w1' });
  expect(nextLessonAction(course, 'one-w1')).toEqual({ label: '다음 강의', href: '/learn/lesson/two?autoplay=1', lessonId: 'two' });
});
it('returns home for locked, last or unknown lessons', () => {
  const home = { label: '학습 홈으로', href: '/learn' };
  expect(nextLessonAction({ ...course, available: ['one'] }, 'one')).toEqual(home);
  expect(nextLessonAction(course, 'two')).toEqual(home);
  expect(nextLessonAction(course, 'absent')).toEqual(home);
  expect(nextLessonAction(undefined, 'one')).toEqual(home);
});
