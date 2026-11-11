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
