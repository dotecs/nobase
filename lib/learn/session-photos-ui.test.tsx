import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/app/(main)/learn/actions',()=>({}));
import { SessionPhotoPanel,DiagnosticStepper } from '@/components/learn/SessionPhotoPanel';
import { DiagnosticClient } from '@/app/(main)/learn/diagnostic/DiagnosticClient';
import { HomePanel } from '@/app/(main)/learn/HomePanel';
import type { StudentItem } from './items';
const photo={id:'p',session_id:'s',user_id:'u',path:'p',position:0,url:'https://example.invalid/p'};
describe('session photo student flow',()=>{
  it('requires diagnostic photos before completion without a skip link',()=>{const html=renderToStaticMarkup(<SessionPhotoPanel sessionId="s" userId="u" kind="diagnostic" initialPhotos={[]}/>);expect(html).toContain('마지막으로, 풀이 종이를 찍어 주세요');expect(html).toMatch(/disabled=""[^>]*>진단 끝내기/);expect(html).not.toContain('다음에 올리기');});
  it('a diagnostic photo reveals the finish message and enabled finish link',()=>{const html=renderToStaticMarkup(<SessionPhotoPanel sessionId="s" userId="u" kind="diagnostic" initialPhotos={[photo]}/>);expect(html).toContain('진단을 마쳤어요');expect(html).toContain('코치가 확인하면');expect(html).toContain('href="/learn"');expect(html).toContain('풀이 종이 1');});
  it('practice and review can skip photos',()=>{for(const kind of ['practice','review'])expect(renderToStaticMarkup(<SessionPhotoPanel sessionId="s" userId="u" kind={kind} initialPhotos={[]}/>)).toContain('다음에 올리기');});
  it('four photos hide additional upload, optional completion returns home',()=>{const html=renderToStaticMarkup(<SessionPhotoPanel sessionId="s" userId="u" kind="practice" initialPhotos={Array.from({length:4},(_,i)=>({...photo,id:String(i)}))}/>);expect(html).not.toContain('type="file"');expect(html).toContain('학습 홈으로');});
  it.each([false,true])('stepper current photo/coach stage hasPhotos=%s',hasPhotos=>{const html=renderToStaticMarkup(<DiagnosticStepper hasPhotos={hasPhotos}/>);expect(html).toContain(`aria-current="step">${hasPhotos?'3 코치 확인':'2 사진 올리기'}`);});
  it('home prioritizes missing diagnostic photos',()=>{expect(renderToStaticMarkup(<HomePanel status="awaiting_coach" diagnosticPhotoPending minutes={20} photoRequired={false}/>)).toContain('진단 사진 올리기');});
  it.each(['number','photo'] as const)('per-item photo UI only for a photo answer: %s',answer_type=>{const item:StudentItem={id:'x',version:1,ability_id:'01-1',stem_md:'$1+1$',answer_type,usage:'diagnostic',relation_required:false,variable:null,options:[]};const html=renderToStaticMarkup(<DiagnosticClient userId="u" sessionId="s" planIndex={1} item={item} photo_required={answer_type==='photo'} deadline="2030-01-01"/>);expect(html.includes('type="file"')).toBe(answer_type==='photo');expect(html).not.toContain('이전 문항');});
});
