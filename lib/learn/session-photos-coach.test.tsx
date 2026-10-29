import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(main)/learn/actions',()=>({signedSessionPhotoUrl:vi.fn()}));
import { CoachSessionHeader } from '@/components/learn/CoachSessionHeader';
import { CoachGateControls } from '@/app/(admin)/admin/learn/learners/CoachControls';
describe('coach session photo evidence',()=>{
  it.each([['diagnostic','진단','진단 사진 대기'],['practice','학습','사진 없음'],['review','복습','사진 없음']])('session header %s',(kind,label,missing)=>{const html=renderToStaticMarkup(<CoachSessionHeader kind={kind} startedAt="2026-10-29T00:00:00Z" photos={[]}/>);expect(html).toContain(label);expect(html).toContain(missing);expect(html).toContain('<time');});
  it.each([0,1])('gate photo count %s',count=>{const html=renderToStaticMarkup(<CoachGateControls userId="u" status="awaiting_coach" abilities={[]} latestDiagnosticPhotoCount={count} action={async()=>({})}/>);expect(/disabled="">학습 열기/.test(html)).toBe(count===0);expect(html.includes('사진 없이 열기')).toBe(count===0);if(!count){expect(html).toContain('학생이 풀이 사진을 올리면 열 수 있어요');expect(html).toContain('disabled="">사진 없이 열기');}});
});
