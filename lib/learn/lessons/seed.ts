import { z } from 'zod';
import { lessonSchema,questionSchema,validateLesson } from './schema';
import type { Lesson } from './schema';
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
export const conceptSeedSchema=z.object({pack_id:id,nodes:z.array(z.object({id,pack_id:id.optional(),ability_id:id.nullable().optional(),name:z.string().min(1),one_line:z.string().min(1),check_question:questionSchema.nullable().optional(),lesson_id:id.nullable().optional()})),edges:z.array(z.object({source_id:id,target_id:id,type:z.literal('prerequisite').default('prerequisite')}))}).superRefine((seed,ctx)=>{
 const ids=new Set(seed.nodes.map(n=>n.id));if(ids.size!==seed.nodes.length)ctx.addIssue({code:'custom',message:'개념 ID 중복'});
 for(const node of seed.nodes)if(node.pack_id&&node.pack_id!==seed.pack_id)ctx.addIssue({code:'custom',message:'개념의 pack_id 불일치'});
 const seen=new Set<string>();for(const e of seed.edges){const key=e.source_id+':'+e.target_id;if(!ids.has(e.source_id)||!ids.has(e.target_id)||e.source_id===e.target_id||seen.has(key))ctx.addIssue({code:'custom',message:'개념 간선의 ID 또는 중복을 확인하세요.'});seen.add(key);}
 const done=new Set<string>(),active=new Set<string>();function visit(current:string):boolean{if(active.has(current))return true;if(done.has(current))return false;active.add(current);for(const edge of seed.edges)if(edge.source_id===current&&visit(edge.target_id))return true;active.delete(current);done.add(current);return false;}
 if([...ids].some(visit))ctx.addIssue({code:'custom',message:'개념 선행 관계에 순환이 있습니다.'});
});
export type NewLesson={id:string;version:number;pack_id:string;kind:Lesson['kind'];title:string;ability_ids:string[];body:Lesson;status:'draft'};
export type LessonSeedStore={latestVersion:(id:string)=>Promise<number|null>;conceptIds:(pack:string)=>Promise<string[]>;abilityIds:(pack:string)=>Promise<string[]>;insert:(row:NewLesson)=>Promise<{code?:string;message?:string}|null>};
export async function seedLesson(input:unknown,store:LessonSeedStore){
 const parsed=lessonSchema.parse(input);const lesson=validateLesson(parsed,new Set(await store.conceptIds(parsed.pack_id)));
 const abilities=new Set(await store.abilityIds(lesson.pack_id));if(lesson.ability_ids.some(id=>!abilities.has(id)))throw new Error('DB에 없는 소주제 ID가 있습니다.');
 for(let attempt=0;attempt<3;attempt++){const latest=await store.latestVersion(lesson.id),version=(latest??0)+1;const error=await store.insert({id:lesson.id,version,pack_id:lesson.pack_id,kind:lesson.kind,title:lesson.title,ability_ids:lesson.ability_ids,body:lesson,status:'draft'});if(!error)return version;if(error.code!=='23505')throw new Error(error.message??'레슨 저장 실패');}
 throw new Error('다른 seed가 동시에 실행되었습니다. 잠시 후 다시 실행하세요.');
}
