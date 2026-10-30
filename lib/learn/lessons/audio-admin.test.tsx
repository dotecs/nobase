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
 it('shows no generation button without a key',()=>{const html=renderToStaticMarkup(<LessonsAdmin rows={[{id:'a',version:1,title:'개념',kind:'concept',status:'draft',total:2,generated:0,missing:2,batch:2,characters:10}]} hasKey={false} generate={async()=>({})} advance={async()=>({})}/>);expect(html).toContain('키 없음');expect(html).not.toContain('음성 생성</button>');});
 it('rejects unauthenticated actions before accessing storage',async()=>{mocks.requireCoach.mockRejectedValueOnce(new Error('denied'));expect(await generateAudio('a',1)).toEqual({error:'처리할 수 없습니다.'});expect(mocks.db).not.toHaveBeenCalled();});
 it('returns missing-key status before a DB or provider operation',async()=>{mocks.requireCoach.mockResolvedValueOnce({id:'admin'});vi.stubEnv('ELEVENLABS_API_KEY','');expect(await generateAudio('a',1)).toEqual({error:'키 없음'});expect(mocks.db).not.toHaveBeenCalled();});
});
