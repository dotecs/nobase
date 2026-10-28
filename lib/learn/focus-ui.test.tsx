import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect } from 'vitest';
import { FocusShell } from '@/components/learn/FocusShell';
import { SessionTimer } from '@/components/learn/SessionTimer';
describe('focus layout',()=>{
  it('shows home, accessible progress and no global navigation',()=>{const html=renderToStaticMarkup(<FocusShell title="오늘의 학습" current={3} total={5} remaining={180}><p>문항</p></FocusShell>);expect(html).toContain('href="/learn"');expect(html).toContain('aria-label="문항 3 / 5"');expect(html).not.toContain('<nav');});
  it.each([[120,'warning','02:00'],[30,'error','00:30']])('timer at %s seconds', (remaining,tone,clock)=>{const html=renderToStaticMarkup(<SessionTimer remaining={Number(remaining)}/>);expect(html).toContain(`data-tone="${tone}"`);expect(html).toContain(clock);expect(html).toContain('aria-live="polite"');});
});
