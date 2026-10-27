import { describe,it,expect } from 'vitest';
import { summarizeHome } from './home-summary';
import { pack,state } from './rules/test-fixtures';
describe('server home aggregation',()=>{
  it('counts only goal requirements, combines verified and retained by unit',()=>{const out=summarizeHome(pack(),'goal',[state('verified','01-4'),state('retained','02-4'),state('verified','01-1')],[],new Date('2026-10-27T00:00:00Z'));expect(out).toMatchObject({total:6,verified:1,retained:1});expect(out.units[0]).toMatchObject({total:4,mastered:2});});
  it('seven KST dates include midnight boundary and omit old and future attempts',()=>{const out=summarizeHome(pack(),'goal',[],[{created_at:'2026-10-26T15:00:00Z'},{created_at:'2026-10-26T14:59:59Z'},{created_at:'2026-10-20T14:59:59Z'},{created_at:'2026-10-28T00:00:00Z'}],new Date('2026-10-27T00:00:00Z'));expect(out.activity).toHaveLength(7);expect(out.activity.at(-1)).toEqual({date:'2026-10-27',count:1});expect(out.activity.at(-2)?.count).toBe(1);expect(out.activity.reduce((sum,row)=>sum+row.count,0)).toBe(2);});
});
