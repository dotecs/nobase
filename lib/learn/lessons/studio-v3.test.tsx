import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
it('loads Poor Story only through studio route layouts without preload',()=>{const font=readFileSync('components/studio/font.ts','utf8');expect(font).toContain('Poor_Story');expect(font).toContain('preload:false');for(const p of ['app/layout.tsx','app/(main)/layout.tsx']){if(existsSync(p))expect(readFileSync(p,'utf8')).not.toContain('studioHand');}});

import {renderToStaticMarkup} from 'react-dom/server';
import {CourseSidebar} from '@/components/studio/CourseSidebar';
import root from '@/content/curricula/root-math.json';
import {studioDemo} from './studio-demo';
import {currentChapter} from './curriculum';
it('opens chapter 02 and marks current or worked lessons while disabling unavailable entries',()=>{for(const id of ['rm-11','rm-11-w1']){expect(currentChapter(root,id)).toBe(2);const html=renderToStaticMarkup(<CourseSidebar lesson={{...studioDemo,id}} index={0} course={{curriculum:root,available:['rm-11','rm-11-w1']}}/>);expect(html).toContain('aria-current="page"');expect(html).toContain('aria-disabled="true"');expect(html).not.toContain('href="/learn/lesson/rm-01"');}});

import {formatNum,formulaValues} from './format-num';
import {lessonSchema} from './schema';
it('formats shared numbers and responds to parameter values in formulas',()=>{expect(formatNum(-2.3)).toBe('−2.3');expect(formatNum(2)).toBe('2');expect(formulaValues('a={{a}}',{a:1})).toBe('a=1');expect(formulaValues('a={{a}}',{a:2.5})).toBe('a=2.5');});
it('rejects formulas referencing undefined parameters',()=>{const lesson=structuredClone(studioDemo);lesson.scenes[0].headline!.formula='{{z}}';expect(lessonSchema.safeParse(lesson).success).toBe(false);});

import {equalGraph} from './equal-graph';
it.each([{width:1400,height:400},{width:320,height:700}])('keeps every declared corner visible in equal aspect %j',v=>{const camera={x:[-3,3] as [number,number],y:[-.5,6.5] as [number,number]},g=equalGraph(camera,{...v,left:30,right:24,top:24,bottom:28});expect(g.x[0]).toBeLessThanOrEqual(-3);expect(g.x[1]).toBeGreaterThanOrEqual(3);expect(g.y[0]).toBeLessThanOrEqual(-.5);expect(g.y[1]).toBeGreaterThanOrEqual(6.5);expect(g.unitX).toBeCloseTo(g.unitY);});

import {chalkAt,underlinePoints} from './chalk';
it('keeps unspecified memo TTL persistent but fades red marks over the final 200ms',()=>{expect(chalkAt({type:'handwrite',position:{x:0,y:0},text:'가'},0,9000,'m')).not.toBeNull();expect(chalkAt({type:'pointer',position:{x:0,y:0}},0,2400,'p')?.opacity).toBe(.5);});
it.each(['equal','free'] as const)('places axis underline at actual axis in %s aspect',aspect=>{const g=equalGraph({x:[-3,3],y:[-.5,6.5]},{width:900,height:400,left:30,right:24,top:24,bottom:28},aspect),points=underlinePoints({type:'underline',target:'axis:x'},{...g,target:()=>null});expect(points.every(p=>Math.abs(p.y-g.sy(0))<1)).toBe(true);});

it('provides accessible modal curriculum and responsive two-row controls',()=>{const shell=readFileSync('components/studio/StudioShell.tsx','utf8'),css=readFileSync('components/studio/studio.module.css','utf8');expect(shell).toContain('showModal()');expect(shell).toContain('onCancel');expect(css).toContain('max-width:1279px');expect(css).toContain('max-width:1023px');expect(css).toContain('data-chrome="false"');});

import {validateAuthoredMath} from './authored-math';
import {actionWarnings} from './action-validation';
import {StageControls} from '@/components/studio/stages/StageControls';
it('retains explicit slider controls while defaulting to stepper',()=>{const scene=structuredClone(studioDemo.scenes[0]);if(scene.stage.type!=='slider')throw Error('fixture');scene.stage.param.control='slider';expect(renderToStaticMarkup(<StageControls scene={scene} value={1} onGrab={()=>{}} onExplore={()=>{}}/>)).toContain('type="range"');});
it('rejects broken authored point TeX and warns on more than four memos',()=>{const lesson=structuredClone(studioDemo),scene=lesson.scenes[0];scene.narration[0].cue={actions:[{type:'point',x:0,y:0,label:'\\notacommand'}]};expect(()=>validateAuthoredMath(lesson)).toThrow();scene.narration[0].cue.actions=Array.from({length:5},()=>({type:'handwrite' as const,position:{x:1,y:1},text:'가'}));expect(actionWarnings(scene).join()).toContain('손글씨');});

import {ChalkLayer} from '@/components/studio/ChalkLayer';
it('centers a responsive memo by its actual width',()=>{const mark=chalkAt({type:'handwrite',position:{x:0,y:2},text:'메모',align:'middle'},0,900,'memo')!;const html=renderToStaticMarkup(<svg><ChalkLayer marks={[mark]} space={{x:[-3,3],y:[-2,4],sx:x=>300+x*50,sy:y=>300-y*50,target:()=>null}}/></svg>);expect(html).toContain('x="235"');expect(html).toContain('width="130"');});
