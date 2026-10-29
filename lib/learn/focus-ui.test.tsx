import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect } from 'vitest';
import { FocusShell } from '@/components/learn/FocusShell';
import { SessionTimer } from '@/components/learn/SessionTimer';
describe('focus layout',()=>{
  it.each([['diagnostic','진단 · 정답 비공개'],['learning','학습'],['review','복습']] as const)('tone %s', (tone,label)=>{const html=renderToStaticMarkup(<FocusShell tone={tone} title="제목" current={2} total={5}><p>문항</p></FocusShell>);expect(html).toContain(label);expect(html).toContain('data-tone="'+tone+'"');if(tone==='diagnostic')expect(html).not.toContain('문항 2 / 5');});
  it('shows home, accessible progress and no global navigation',()=>{const html=renderToStaticMarkup(<FocusShell title="오늘의 학습" current={3} total={5} remaining={180}><p>문항</p></FocusShell>);expect(html).toContain('href="/learn"');expect(html).toContain('aria-label="문항 3 / 5"');expect(html).not.toContain('<nav');});
  it.each([[120,'warning','02:00'],[30,'error','00:30']])('timer at %s seconds', (remaining,tone,clock)=>{const html=renderToStaticMarkup(<SessionTimer remaining={Number(remaining)}/>);expect(html).toContain(`data-tone="${tone}"`);expect(html).toContain(clock);expect(html).toContain('aria-live="polite"');});
});
