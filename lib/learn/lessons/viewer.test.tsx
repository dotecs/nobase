import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LessonViewer } from '@/components/learn/lesson/LessonViewer';
import { LessonText } from '@/components/learn/lesson/LessonText';
import { prototypeLesson } from './prototype-fixture';
import { captionDuration,chooseTodayLesson,lessonEventsSchema,summarizeLessonActivity } from './events';
import type { EventRow,LessonRow } from './types';
describe('lesson viewing without grading',()=>{
 it.each(['x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}',"b=2b'"])('renders read-only caption TeX %s when the input parser cannot',math=>{const html=renderToStaticMarkup(<LessonText text={'설명 $'+math+'$'}/>);expect(html).toContain('katex');expect(html).not.toContain('<code');expect(html).not.toContain('aria-label="입력 미리보기"');});
 it('keeps supported caption math on the AST preview path',()=>{const html=renderToStaticMarkup(<LessonText text={'식 $x^2+3x=0$'}/>);expect(html).toContain('aria-label="입력 미리보기"');expect(html).toContain('katex');});
 it('counts partial viewing time once per visit',()=>{const base={lesson_id:'a',lesson_version:1,type:'scene'} as EventRow;expect(summarizeLessonActivity([{...base,payload:{visit_id:'one',elapsed_ms:3000}},{...base,payload:{visit_id:'one',elapsed_ms:7000}},{...base,payload:{visit_id:'two',elapsed_ms:2000}}])[0].seconds).toBe(9);});
 it('renders authored quiz fractions as math instead of input fallback code',()=>{const html=renderToStaticMarkup(<LessonText authored text={'$k>\\tfrac94$'}/>);expect(html).toContain('katex');expect(html).not.toContain('<code');});
 it('renders seven scenes with no autoplay and worked labels',()=>{const html=renderToStaticMarkup(<LessonViewer lesson={prototypeLesson()} record={async()=>({})}/>);expect(html.match(/data-scene="true"/g)).toHaveLength(7);expect(html).not.toMatch(/autoPlay|autoplay/);expect(html).toContain('머릿속');expect(html).toContain('종이에');expect(html).toContain('data-tone="lesson"');expect(html).toContain('문제풀이');});
 it('omits role labels on concept lessons',()=>{const lesson=prototypeLesson();lesson.kind='concept';lesson.scenes=[{...lesson.scenes[0],narration:[{id:'a',text:'개념 설명',role:'say'}]}];const html=renderToStaticMarkup(<LessonViewer lesson={lesson} record={async()=>({})}/>);expect(html).not.toContain('data-role=');expect(html).toContain('>개념<');});
 it('scales caption timers with text and speed',()=>{expect(captionDuration('a'.repeat(100),1.25)).toBe(6800);expect(captionDuration('a',1)).toBe(2000);});
 it('only accepts lesson telemetry in bounded batches',()=>{expect(lessonEventsSchema.safeParse([{type:'attempt',payload:{}}]).success).toBe(false);expect(lessonEventsSchema.safeParse(Array.from({length:51},()=>({type:'quiz',payload:{}}))).success).toBe(false);});
 it('matches recommended ability to newest visible lesson',()=>{const base={id:'one',version:1,status:'live',kind:'concept',ability_ids:['02-1']} as LessonRow;expect(chooseTodayLesson([base,{...base,version:2},{...base,version:3,status:'draft'}],['02-1'])?.version).toBe(2);expect(chooseTodayLesson([base],['03-1'])).toBeNull();});
 it('summarizes viewing duration, why clicks and gaps only',()=>{const event={lesson_id:'rm-11',lesson_version:1} as EventRow;expect(summarizeLessonActivity([{...event,type:'complete',payload:{duration_ms:12000}},{...event,type:'why_click',payload:{}},{...event,type:'gap',payload:{concept_id:'c.a'}},{...event,type:'quiz',payload:{correct:true}}])).toEqual([{id:'rm-11',version:1,seconds:12,why:1,gaps:['c.a'],completed:true}]);});
});
