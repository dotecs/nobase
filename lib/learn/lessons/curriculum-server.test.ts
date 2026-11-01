import {it,expect,vi} from 'vitest';
const query=vi.hoisted(()=>({select:vi.fn(),in:vi.fn()}));
vi.mock('./data',()=>({lessonDb:()=>({from:vi.fn(()=>query)})}));
import {loadCurriculum} from './curriculum-server';
it('loads availability in one batched lesson query and deduplicates versions',async()=>{query.select.mockReturnValue(query);query.in.mockReturnValueOnce(query).mockResolvedValueOnce({data:[{id:'rm-11'},{id:'rm-11'}],error:null});const result=await loadCurriculum('root-math');expect(query.select).toHaveBeenCalledTimes(1);expect(query.select).toHaveBeenCalledWith('id');expect(query.in).toHaveBeenLastCalledWith('status',['reviewed','live']);expect(result?.available).toEqual(['rm-11']);});
