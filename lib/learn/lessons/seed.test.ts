import { describe,it,expect,vi } from 'vitest';
import { conceptSeedSchema,seedLesson,type LessonSeedStore } from './seed';
import { prototypeLesson } from './prototype-fixture';
import { validateAuthoredMath } from './authored-math';
function store(){return {latestVersion:vi.fn(async()=>2),conceptIds:vi.fn(async()=>['c.discriminant-meaning']),abilityIds:vi.fn(async()=>['11-1']),insert:vi.fn<LessonSeedStore['insert']>().mockResolvedValue(null)};}
describe('append-only lesson seeds',()=>{
 it('accepts authored primes and plus/minus but rejects malformed TeX',()=>{const lesson=prototypeLesson();expect(()=>validateAuthoredMath(lesson)).not.toThrow();const stage=lesson.scenes[1].stage;if(stage.type==='steps')stage.steps[0].tex='\\frac{1}{';expect(()=>validateAuthoredMath(lesson)).toThrow('TeX');});
 it('inserts the next version as draft without modifying old content',async()=>{const db=store();expect(await seedLesson(prototypeLesson(),db)).toBe(3);expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({id:'rm-11',version:3,status:'draft'}));});
 it('checks remote concepts before writing',async()=>{const db=store();db.conceptIds.mockResolvedValue([]);await expect(seedLesson(prototypeLesson(),db)).rejects.toThrow('없는 개념');expect(db.insert).not.toHaveBeenCalled();});
 it('checks remote abilities before writing',async()=>{const db=store();db.abilityIds.mockResolvedValue([]);await expect(seedLesson(prototypeLesson(),db)).rejects.toThrow('소주제');expect(db.insert).not.toHaveBeenCalled();});
 it('retries only a concurrent version collision',async()=>{const db=store();db.latestVersion.mockResolvedValueOnce(2).mockResolvedValueOnce(3);db.insert.mockResolvedValueOnce({code:'23505'});expect(await seedLesson(prototypeLesson(),db)).toBe(4);expect(db.insert).toHaveBeenCalledTimes(2);});
 it('does not retry ordinary DB failures',async()=>{const db=store();db.insert.mockResolvedValueOnce({code:'23503',message:'missing pack'});await expect(seedLesson(prototypeLesson(),db)).rejects.toThrow('missing pack');expect(db.insert).toHaveBeenCalledTimes(1);});
 it('validates concept IDs, pack and acyclic edges',()=>{const seed={pack_id:'root-math',nodes:['a','b'].map(id=>({id,name:id,one_line:'설명'})),edges:[{source_id:'a',target_id:'b'}]};expect(conceptSeedSchema.parse(seed).edges[0].type).toBe('prerequisite');expect(conceptSeedSchema.safeParse({...seed,edges:[...seed.edges,{source_id:'b',target_id:'a'}]}).success).toBe(false);expect(conceptSeedSchema.safeParse({...seed,edges:[{source_id:'x',target_id:'b'}]}).success).toBe(false);});
});
