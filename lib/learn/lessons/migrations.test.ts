import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
describe('lesson migration boundaries',()=>{
 it.each(['060_learn_lessons.sql','061_learn_concepts.sql'])('enables RLS and keeps history in %s',file=>{const sql=readFileSync('supabase/migrations/'+file,'utf8');const tables=[...sql.matchAll(/create table public\.(\w+)/g)].map(m=>m[1]);for(const table of tables)expect(sql).toContain('alter table public.'+table+' enable row level security');expect(sql).not.toMatch(/\bDROP\b|\bTRUNCATE\b|DELETE FROM|ALTER COLUMN TYPE/i);expect(sql).toContain('-- ROLLBACK:');});
 it('restricts event ownership and uses a private bucket',()=>{const sql=readFileSync('supabase/migrations/060_learn_lessons.sql','utf8');expect(sql).toContain('with check(user_id=auth.uid()');expect(sql).toContain("'learn-lessons',false");expect(sql).not.toContain('learn-evidence');expect(sql).toContain("status in ('reviewed','live')");});
});
