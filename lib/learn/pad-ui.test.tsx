import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PadEmpty } from '@/app/(main)/learn/pad/PadEmpty';
import { shouldEnterPad,PadModeCard } from '@/components/learn/PadModeCard';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn(),replace:vi.fn()})}));
describe('pad entry',()=>{
  it('enters only on narrow screen with an open session and preference',()=>{
    for(const narrow of [false,true])for(const open of [false,true])for(const preference of [null,'0','1'])expect(shouldEnterPad(narrow,open,preference)).toBe(narrow&&open&&preference==='1');
  });
  it('renders the session-empty state and link home',()=>{
    const html=renderToStaticMarkup(<PadEmpty/>);expect(html).toContain('지금 진행 중인 학습이 없어요');expect(html).toContain('학습 홈으로');expect(html).toContain('href="/learn"');
  });
  it('shows an entry card only for an open session',()=>{
    expect(renderToStaticMarkup(<PadModeCard hasOpenSession={false}/>)).toBe('');
    expect(renderToStaticMarkup(<PadModeCard hasOpenSession/>)).toContain('이 폰을 입력 패드로 쓰기');
  });
  it('shared photo input reflects a remotely synced path',()=>{
    expect(renderToStaticMarkup(<PhotoCapture userId="u" required value="u/attempts/p.png" onChange={()=>{}}/>)).toContain('✓ 올렸어요');
    expect(renderToStaticMarkup(<PhotoCapture userId="u" required value={null} onChange={()=>{}}/>)).not.toContain('✓ 올렸어요');
  });
});
