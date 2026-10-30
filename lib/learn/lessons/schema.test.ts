import { describe,it,expect } from 'vitest';
import { prototypeLesson } from './prototype-fixture';
import { lessonSchema,validateLesson,graphSchema } from './schema';
import { spokenMath,ttsScript } from './tts-script';
describe('lesson schema and authored fixture',()=>{
 it('adapts all seven prototype scenes without production seeds',()=>{expect(prototypeLesson().scenes).toHaveLength(7);});
 it('concept permits only say, worked permits roles',()=>{const l=prototypeLesson();expect(lessonSchema.safeParse({...l,kind:'concept'}).success).toBe(false);expect(lessonSchema.safeParse({...l,kind:'concept',scenes:l.scenes.map(s=>({...s,narration:s.narration.map(n=>({...n,role:'say'}))}))}).success).toBe(true);});
 it('rejects duplicate sentence IDs',()=>{const l=prototypeLesson();l.scenes[1].narration[0].id=l.scenes[0].narration[0].id;expect(lessonSchema.safeParse(l).success).toBe(false);});
 it('rejects invalid graph math and undeclared variables',()=>{for(const expr of ['x+','alert(1)','x+a'])expect(graphSchema.safeParse({type:'graph',x:[-4,4],y:[-5,7],fns:[{expr,c:'c1'}],aria:'test'}).success).toBe(false);});
 it('requires referenced concept IDs',()=>{expect(()=>validateLesson(prototypeLesson(),new Set())).toThrow('없는 개념');expect(validateLesson(prototypeLesson(),new Set(['c.discriminant-meaning'])).id).toBe('rm-11');});
 it('rejects invalid cue and quiz correct option',()=>{const l=prototypeLesson();l.scenes[0].narration[0].cue={step:0};expect(lessonSchema.safeParse(l).success).toBe(false);});
 it.each([['b^2-4ac','비 제곱 마이너스 사 에이 씨'],['\\frac{a}{b}','비 분의 에이'],['\\sqrt{}','루트'],['x=-7','엑스는 마이너스 칠'],['x\\le 3','엑스 작거나 같다 삼']])('reads %s', (input,output)=>expect(spokenMath(input)).toBe(output));
 it('uses explicit TTS verbatim, otherwise role directions and spoken math',()=>{expect(ttsScript({id:'a',role:'think',text:'$x=-7$'})).toBe('[slower, thinking aloud] 엑스는 마이너스 칠');expect(ttsScript({id:'a',role:'write',text:'unused',tts:'지정 대본'})).toBe('지정 대본');});
});
