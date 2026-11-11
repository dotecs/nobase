import { it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { vimeoEmbedUrl } from '@/lib/video-embed';
import { StudioViewer } from '@/components/studio/StudioViewer';
import { studioDemo } from './studio-demo';

it('turns vimeo page links into player embeds', () => {
  expect(vimeoEmbedUrl('https://vimeo.com/1193226697?share=copy&')).toMatch(/^https:\/\/player\.vimeo\.com\/video\/1193226697\?/);
  expect(vimeoEmbedUrl('https://example.com/a.mp4')).toBe('https://example.com/a.mp4');
});
it('shows the 동영상 강의 button only when the lesson has an original video', () => {
  expect(renderToStaticMarkup(<StudioViewer lesson={studioDemo} />)).not.toContain('동영상 강의');
  expect(renderToStaticMarkup(<StudioViewer lesson={studioDemo} video={{ title: '수 체계', src: 'https://player.vimeo.com/video/1' }} />)).toContain('동영상 강의');
});
