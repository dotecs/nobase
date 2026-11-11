import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudioText } from '@/components/studio/StudioText';

describe('StudioText', () => {
  it('bold wrapping inline math leaves no raw asterisks', () => {
    const html = renderToStaticMarkup(<StudioText text="**$x$축 대칭** $y$ 대신 $-y$ 를 대입" target="item:t"/>);
    expect(html).not.toContain('**');
    expect(html).toMatch(/<strong>.*축 대칭<\/strong>/);
  });
});

import { LessonText } from '@/components/learn/lesson/LessonText';
describe('LessonText authored', () => {
  it('board note bold wrapping math', () => {
    const html = renderToStaticMarkup(<LessonText authored text="**$y$축 대칭** $x$ 대신 $-x$ 를 대입"/>);
    expect(html).not.toContain('**');
    expect(html).toMatch(/<strong>.*축 대칭<\/strong>/);
  });
  it('plain bold still works and student text keeps asterisks', () => {
    expect(renderToStaticMarkup(<LessonText authored text="**방정식** 등식"/>)).toContain('<strong>방정식</strong>');
    expect(renderToStaticMarkup(<LessonText text="**a**"/>)).toContain('**a**');
  });
});
