import { describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rows: [] as unknown[], tables: [] as string[] }));
vi.mock('next/headers', () => ({}));
vi.mock('@/lib/supabase-admin', () => ({ createAdminSupabaseClient: () => ({ from: (table: string) => {
  mock.tables.push(table);
  const query = { select: () => query, in: () => query, order: () => query, range: async () => ({ data: mock.rows, error: null }) };
  return query;
} }) }));
import { loadLearnItems, toStudentItem, type LearnItem } from './items';
describe('server item projection', () => {
  it('exposes only the need for a relation and variable, never its answer or relation',()=>{
    const row={id:'i',version:1,ability_id:'a',stem_md:'Solve',answer_type:'number',usage:'practice',answer_spec:{type:'number',value:'-7',variable:'x',relation:'<='}} as unknown as LearnItem;
    const out=toStudentItem(row);expect(out).toMatchObject({relation_required:true,variable:'x'});expect(out).not.toHaveProperty('relation');expect(JSON.stringify(out)).not.toMatch(/-7|<=|answer_spec/);
    expect(toStudentItem({...row,answer_spec:{type:'number',value:'-7',variable:'x',relation:'='}}).relation_required).toBe(false);
  });
  it('uses service-role table instead of live-only views and selects latest version', async () => {
    mock.rows = [1,2].map(version => ({ id:'i', version, ability_id:'a', status:'reviewed' }));
    expect((await loadLearnItems(['a'])).map(row => row.version)).toEqual([2]); expect(mock.tables).toEqual(['learn_items']);
  });
  it('allowlists student fields and choice labels without keys, hints or rubric', () => {
    const row = { id:'i',version:1,ability_id:'a',stem_md:'Choose',answer_type:'choice',usage:'diagnostic',answer_spec:{ type:'choice',options:[{id:'1',text_md:'A',misconception_id:'secret'}],correct:['1'] }, hints:['secret'],rubric:['secret'] } as unknown as LearnItem;
    const out = toStudentItem(row);
    expect(out.options).toEqual([{id:'1',text_md:'A'}]);
    expect(JSON.stringify(out)).not.toMatch(/secret|correct|answer_spec|rubric|hints/);
  });
});
