import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomePanel } from '@/app/(main)/learn/HomePanel';
import { summarizeHome } from './home-summary';
import { pack,state } from './rules/test-fixtures';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('@/app/(main)/learn/actions',()=>({startDiagnostic:vi.fn(),startSession:vi.fn()}));
const summary=summarizeHome(pack(),'goal',[state('verified','01-1')],[],new Date('2026-10-28T00:00:00Z'));
describe('home guidance',()=>{
  it.each([['diagnostic_pending','출발점 진단'],['diagnostic_in_progress','진단을 이어서 풀어요'],['awaiting_coach','코치가 결과를 보고 있어요'],['active','오늘의 학습'],['paused','학습이 잠시 멈춰 있어요']])('%s first task', (status,title)=>{const html=renderToStaticMarkup(<HomePanel status={status} minutes={15} photoRequired summary={summary} itemsPerSession={5} maxMinutes={15}/>);expect(html).toContain(`<h2>${title}</h2>`);if(status==='awaiting_coach'||status==='paused')expect(html).not.toContain('<button');if(status==='active'){expect(html).toContain('5문항 · 약 15분');expect(html).not.toContain('복습 먼저 하기');}});
  it('renders every topic dot and puts due review above learning without blocking it',()=>{const html=renderToStaticMarkup(<HomePanel status="active" minutes={15} photoRequired={false} summary={summary} due={2} itemsPerSession={5} maxMinutes={15}/>);expect(html.match(/data-topic-dot/g)).toHaveLength(24);expect(html.indexOf('복습 먼저 하기')).toBeLessThan(html.indexOf('오늘의 학습'));expect(html).toContain('학습 시작');expect(summary.units[0].abilities[0]).toMatchObject({id:'01-1',name:'Ability',state:'verified'});});
});
