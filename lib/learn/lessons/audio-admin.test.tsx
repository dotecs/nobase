import { describe,it,expect,vi,afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks=vi.hoisted(()=>({requireCoach:vi.fn(),db:vi.fn()}));
vi.mock('@/lib/learn/runtime',()=>({requireCoach:mocks.requireCoach,runtimeError:()=> '처리할 수 없습니다.'}));
vi.mock('@/lib/learn/lessons/data',()=>({lessonDb:mocks.db}));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
import { generateAudio } from '@/app/(admin)/admin/learn/lessons/actions';
import { LessonsAdmin } from '@/app/(admin)/admin/learn/lessons/LessonsAdmin';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe('audio admin boundaries',()=>{
 it('shows no generation button without a key',()=>{const html=renderToStaticMarkup(<LessonsAdmin rows={[{id:'a',version:1,title:'개념',kind:'concept',status:'draft',total:2,generated:0,missing:2,batch:2,characters:10}]} hasKey={false} advance={async()=>({})}/>);expect(html).toContain('키 없음');expect(html).toContain('음성 처리 필요');expect(html).not.toContain('선택한 강의 처리');expect(html).not.toContain('type="checkbox"');});
 it('lists lessons that need audio first, with bulk selection, and keeps finished ones below',()=>{const row=(id:string,version:number,status:string,missing:number)=>({id,version,title:'강의 '+id+' v'+version,kind:'concept',status,total:10,generated:10-missing,missing,batch:missing,characters:missing*20});const html=renderToStaticMarkup(<LessonsAdmin rows={[row('a',2,'draft',10),row('a',1,'reviewed',0),row('b',1,'live',0),row('c',3,'draft',0),row('c',2,'reviewed',4),row('c',1,'reviewed',9)] as never} hasKey advance={async()=>({})}/>);expect(html.indexOf('음성 처리 필요')).toBeLessThan(html.indexOf('전체 강의'));const todo=html.slice(html.indexOf('음성 처리 필요'),html.indexOf('전체 강의'));expect(todo).toContain('강의 a v2');expect(todo).toContain('강의 c v2');expect(todo).toContain('학습자에게 보이는 버전');expect(todo).not.toContain('강의 b v1');expect(todo).not.toContain('강의 c v1');expect(todo).toContain('전체 선택');expect(todo).toContain('선택한 강의 처리');expect(html).toContain('이전 버전 1개');expect(html).toContain('target="_blank"');});
 it('rejects unauthenticated actions before accessing storage',async()=>{mocks.requireCoach.mockRejectedValueOnce(new Error('denied'));expect(await generateAudio('a',1)).toEqual({error:'처리할 수 없습니다.'});expect(mocks.db).not.toHaveBeenCalled();});
 it('returns missing-key status before a DB or provider operation',async()=>{mocks.requireCoach.mockResolvedValueOnce({id:'admin'});vi.stubEnv('ELEVENLABS_API_KEY','');expect(await generateAudio('a',1)).toEqual({error:'키 없음'});expect(mocks.db).not.toHaveBeenCalled();});
});
