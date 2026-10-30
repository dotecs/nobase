import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { lessonSchema } from './schema';
import { prototypeLesson } from './prototype-fixture';
import { normalizeLessonActions,sentenceActions } from './legacy-actions';
import type { Action } from './action-schema';
function fixture(){const lesson=prototypeLesson();lesson.scenes=[lesson.scenes[3]];return lesson;}
describe('studio schema compatibility',()=>{
 it.each(['rm-11','rm-11-w1'])('keeps committed v1 %s valid',id=>{expect(lessonSchema.safeParse(JSON.parse(readFileSync('content/lessons/'+id+'.json','utf8'))).success).toBe(true);});
 it('preserves headline, layout, initial and actions',()=>{const lesson=fixture();const scene=lesson.scenes[0];scene.headline={title:'눈으로 이해하다',accent:'눈으로'};scene.layout='stage-right';if(scene.stage.type==='slider')scene.stage.initial={hidden_fns:[0]};scene.narration[0].cue={actions:[{type:'param',name:'c',from:-3,to:3,at_ms:100,duration_ms:2000,easing:'ease-in-out'}]};expect(lessonSchema.parse(lesson)).toEqual(lesson);});
 it.each([{type:'param',name:'a',to:1},{type:'draw',target:'fn:1'},{type:'reveal',target:'step',index:0},{type:'highlight',target:'fn:5'},{type:'camera',x:[1,-1],y:[-2,2]},{type:'param',name:'c',to:1,at_ms:-1},{type:'point',x:1},{type:'point',x:1,on:'fn:5'}])('rejects invalid action %j',action=>{const lesson=fixture();lesson.scenes[0].narration[0].cue={actions:[action as Action]};expect(lessonSchema.safeParse(lesson).success).toBe(false);});
 it('rejects hidden function indices outside the stage',()=>{const lesson=fixture();const stage=lesson.scenes[0].stage;if(stage.type==='slider')stage.initial={hidden_fns:[1]};expect(lessonSchema.safeParse(lesson).success).toBe(false);});
 it('expands cue.step 3 into cumulative reveals without mutating v1',()=>{const lesson=prototypeLesson();const scene=lesson.scenes[1];scene.narration[0].cue={step:3};const before=JSON.stringify(lesson),result=normalizeLessonActions(lesson);expect(result.scenes[1].narration[0].cue?.actions).toEqual([0,1,2,3].map(index=>({type:'reveal',target:'step',index})));expect(JSON.stringify(lesson)).toBe(before);expect(normalizeLessonActions(result)).toEqual(result);expect(result.scenes[1].narration[0].cue?.step).toBe(3);});
 it('maps legacy color highlights to stable function targets',()=>{const scene=prototypeLesson().scenes[0];expect(sentenceActions(scene,{id:'a',role:'say',text:'설명',cue:{highlight:'c2'}})).toEqual([{type:'highlight',target:['fn:1'],dim_others:true}]);});
});
