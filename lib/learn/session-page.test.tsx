import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mock=vi.hoisted(()=>({kind:'practice',complete:false}));
vi.mock('./learning-runtime',()=>({learningView:async()=>({...mock,summary:{correct:0},sessionId:'session',planIndex:0})}));
vi.mock('./runtime',()=>({runtimeError:()=>{throw new Error('Unexpected rendering error');}}));
vi.mock('@/app/(main)/learn/session/[id]/LearningClient',()=>({LearningClient:()=>null,FeedbackPanel:()=>null}));
import LearningPage from '@/app/(main)/learn/session/[id]/page';
describe('session heading',()=>{
  it.each([['practice',false,'오늘의 학습'],['review',false,'오늘의 복습'],['review',true,'오늘의 복습']] as const)('%s complete=%s',async(kind,complete,title)=>{mock.kind=kind;mock.complete=complete;const html=renderToStaticMarkup(await LearningPage({params:Promise.resolve({id:'session'})}));expect(html).toContain(`<h1>${title}</h1>`);});
});
