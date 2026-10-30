import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildTimeline,timelinePosition,waveformPeaks,formatTimelineTime } from './timeline';
import { studioDemo } from './studio-demo';
import { stageStateAt } from './stage-state-at';
import { prototypeLesson } from './prototype-fixture';
import { audioDurationSchema } from './audio-duration';
import { Caption } from '@/components/studio/Caption';
import StudioPlayer from '@/components/studio/StudioPlayer';
import type { Scene } from './schema';
const scene=studioDemo.scenes[0];
describe('studio timeline',()=>{
 it('accumulates stored durations and text estimates in media time',()=>{const timeline=buildTimeline(scene,{[scene.narration[0].id]:1234});expect(timeline.starts[1]).toBe(1234);expect(timeline.entries[1].durationMs).toBe(Math.max(2000,scene.narration[1].text.length*85));expect(timelinePosition(timeline,1234)).toEqual({index:1,localMs:0,ended:false});expect(timelinePosition(timeline,timeline.totalMs)).toMatchObject({index:2,ended:true});expect(formatTimelineTime(84300)).toBe('01:24');});
 it('uses media durations regardless of playback speed and clamps scrub boundaries',()=>{const timeline=buildTimeline(scene);expect(timelinePosition(timeline,-30).localMs).toBe(0);expect(timelinePosition(timeline,timeline.totalMs+500)).toEqual(timelinePosition(timeline,timeline.totalMs));expect(buildTimeline(scene,{[scene.narration[0].id]:NaN})).toEqual(timeline);});
 it('reduces decoded channels to 64 normalized bars with a silent fallback',()=>{const data=new Float32Array(640);data[12]=.6;data[620]=.3;const bars=waveformPeaks([data]);expect(bars).toHaveLength(64);expect(bars[1]).toBe(1);expect(bars[62]).toBe(.5);expect(waveformPeaks([new Float32Array(100)])).toEqual(Array(64).fill(.25));});
 it('renders an inline emphasized math caption and worked role',()=>{const html=renderToStaticMarkup(<Caption sentence={{id:'s',role:'think',text:'**그래프**는 $$y=ax^2$$예요.'}} worked/>);expect(html).toContain('<strong>');expect(html).toContain('머릿속');expect(html).toContain('katex');expect(html).not.toContain('katex-display');expect(html).not.toContain('<p>');});
 it('renders the reference scene player without audio, with separate captions and accessible transport controls',()=>{const html=renderToStaticMarkup(<StudioPlayer scene={scene}>{({bar})=><div>{bar}</div>}</StudioPlayer>);for(const text of ['aria-label="재생"','aria-label="재생 위치"','aria-label="재생 속도"','자막 모드'])expect(html).toContain(text);expect(html).toContain('aria-label="자막 켜기/끄기"');expect(html).not.toContain('aria-label="현재 자막"');});
 it('rejects invalid playback metadata before a database call',()=>{for(const value of [0,-1,NaN,Infinity,2147483648])expect(audioDurationSchema.safeParse({sentenceId:'s',durationMs:value}).success).toBe(false);expect(audioDurationSchema.parse({sentenceId:'s',durationMs:3250}).durationMs).toBe(3250);});
});
describe('pure stage state foundation',()=>{
 it('interpolates param halfway and computes points on the moving function',()=>{const timeline=buildTimeline(scene),t=timeline.starts[1]+1100,before=JSON.stringify(scene),state=stageStateAt(scene,t,timeline.starts);expect(state.params.a).toBeCloseTo(1.5,4);expect(state.points[0].y).toBeCloseTo(1.5,4);expect(state.points[1].y).toBeCloseTo(6,4);expect(JSON.stringify(scene)).toBe(before);});
 it('rewinds deterministically after advancing across sentences',()=>{const {starts,totalMs}=buildTimeline(scene),expected=stageStateAt(scene,900,starts);stageStateAt(scene,totalMs,starts);expect(stageStateAt(scene,900,starts)).toEqual(expected);});
 it('reveals hidden functions and draws to the requested fraction',()=>{const copy=structuredClone(scene);if(copy.stage.type==='slider')copy.stage.initial={hidden_fns:[0]};copy.narration=[{id:'draw',role:'say',text:'곡선을 그려요.',cue:{actions:[{type:'draw',target:'fn:0',at_ms:100,duration_ms:1000}]}}];expect(stageStateAt(copy,0,[0]).visibleFns).toEqual([]);expect(stageStateAt(copy,600,[0]).drawProgress['fn:0']).toBe(.5);});
 it('starts a later overlapping param action at the interpolated prior value',()=>{const copy=structuredClone(scene);copy.narration=[{id:'a',role:'say',text:'변화',cue:{actions:[{type:'param',name:'a',from:0,to:2,duration_ms:1000},{type:'param',name:'a',to:3,at_ms:500,duration_ms:500}]}}];expect(stageStateAt(copy,500,[0]).params.a).toBe(1);expect(stageStateAt(copy,750,[0]).params.a).toBe(2);expect(stageStateAt(copy,1000,[0]).params.a).toBe(3);});
 it('replays legacy reveals cumulatively with no future steps on rewind',()=>{const copy:Scene=prototypeLesson().scenes[1];copy.narration=[{id:'a',role:'say',text:'첫 단계',cue:{step:0}},{id:'b',role:'say',text:'다음 단계',cue:{step:2}}];expect(stageStateAt(copy,1000,[0,1000]).revealed.step).toEqual([0,1,2]);expect(stageStateAt(copy,200,[0,1000]).revealed.step).toEqual([0]);});
});
