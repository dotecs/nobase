import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {actionSchema,type Action} from './action-schema';
import {actionErrors} from './action-validation';
import {stageStateAt} from './stage-state-at';
import {moveGeometry} from './move';
import {moveFixture} from './move-fixture';
import {StudioMath} from '@/components/studio/StudioMath';
import {MoveCopy,measuredMoveBox} from '@/components/studio/MoveLayer';
import {instructionColor} from './instruction-style';
import {labelBox} from './point-labels';
import {lessonSchema,type Scene} from './schema';
import {StudioStage} from '@/components/studio/stages/StudioStage';
import {ChalkSurface} from '@/components/studio/ChalkSurface';
const state=(t:number,scene=moveFixture)=>stageStateAt(scene,t,[0,4000],{durations:{'move-2':2000}});
function fixture(actions:Action[]):Scene{return {...moveFixture,narration:[{...moveFixture.narration[0],cue:{actions}},moveFixture.narration[1]]};}
it('requires one complete move pair form and bounded timing',()=>{
 for(const patch of [{},{from:'a'},{to:'b/p'},{pairs:[]},{from:'a',to:'b/p',pairs:[['c','d/p']]},{from:'a',to:'b'},{from:'a',to:'b/p',duration_ms:199},{from:'a',to:'b/p',duration_ms:2001},{pairs:[['a','b/p']],stagger_ms:-1}])expect(actionSchema.safeParse({type:'move',...patch}).success).toBe(false);
 expect(actionSchema.safeParse({type:'move',from:'item:fa/a1',to:'item:fac/a'}).success).toBe(true);
 expect(actionSchema.safeParse(moveFixture.narration[0].cue!.actions![1]).success).toBe(true);
});
it('checks existence, actual part targets, and duplicate destinations across sentences',()=>{
 expect(actionErrors(moveFixture)).toEqual([]);
 expect(actionErrors(fixture([{type:'move',from:'missing',to:'item:fac/a'}]))).toContain('move 대상 범위 오류');
 expect(actionErrors(fixture([{type:'move',from:'item:fa/a1',to:'item:fac'}]))).toContain('move 도착은 부분 대상이어야 합니다.');
 const scene=fixture([{type:'move',from:'item:fa/a1',to:'item:fac/a'}]);scene.narration[1]={...scene.narration[1],cue:{actions:[{type:'move',from:'item:fb/b2',to:'item:fac/a'}]}};
 expect(actionErrors(scene)).toContain('move 도착 대상 중복: item:fac/a');
 expect(actionErrors(fixture([{type:'move',from:'item:fa/a1',to:'item:fac/no'}]))).toContain('move 대상 범위 오류');
});
it('hides all future destinations and computes midflight, arrival and stagger from time',()=>{
 expect(state(999).moves?.every(m=>m.progress===0&&!m.flying&&!m.arrived)).toBe(true);
 expect(state(1350).moves?.[0]).toMatchObject({progress:.5,flying:true,arrived:false});
 expect(state(1350).moves?.[1].progress).toBeCloseTo(170/700);
 expect(state(1700).moves?.[0]).toMatchObject({progress:1,flying:false,arrived:true});
 expect(state(3080).moves?.every(m=>m.arrived&&!m.flying)).toBe(true);
 expect(state(1350)).toEqual(state(1350));
 state(5000);expect(state(999).moves?.every(m=>!m.arrived)).toBe(true);
});
it('keeps arrival colors through the selected sentence or scene only',()=>{
 expect(instructionColor(state(3100),'item:fac/a')).toBe('var(--studio-tint-mint)');
 expect(instructionColor(state(4000),'item:fac/a')).toBeUndefined();
 const scene=fixture([{type:'move',from:'item:fa/a1',to:'item:fac/a',color:'hand',keep_color:'scene'}]);
 expect(instructionColor(state(5000,scene),'item:fac/a')).toBe('var(--studio-tint-hand)');
 expect(instructionColor(state(1350),'item:fa/a1')).toBe('var(--studio-tint-mint)');
 expect(instructionColor(state(1700),'item:fa/a1')).toBeUndefined();
});
it('clear all removes in-flight copies but preserves timed arrivals and later moves',()=>{
 const scene=fixture([{type:'move',from:'item:fa/a1',to:'item:fac/a'},{type:'move',from:'item:fb/b2',to:'item:fac/b',at_ms:500},{type:'clear',what:'all',at_ms:800},{type:'move',from:'item:fa/c1',to:'item:fac/c',at_ms:1000}]);
 expect(state(900,scene).moves?.map(m=>[m.arrived,m.flying])).toEqual([[true,false],[false,false],[false,false]]);
 expect(state(2000,scene).moves?.map(m=>m.arrived)).toEqual([true,true,true]);
 expect(state(750,scene).moves?.[1].flying).toBe(true);
});
it('renders original clone HTML, removes clones at endpoints and in reduced motion',()=>{
 const html='<span class="mord mathnormal">x</span>',measurement={from:labelBox(10,20,20,30),to:labelBox(100,80,40,60),source:{html,fontFamily:'KaTeX_Main',fontSize:'30px',fontWeight:'400',fontStyle:'normal',lineHeight:'normal',color:'var(--studio-ink)'}};
 expect(renderToStaticMarkup(<MoveCopy move={state(1350).moves![0]} measurement={measurement}/>)).toContain(html);
 for(const t of [999,1700])expect(renderToStaticMarkup(<MoveCopy move={state(t).moves![0]} measurement={measurement}/>)).toBe('');
 expect(renderToStaticMarkup(<MoveCopy reduced move={state(1350).moves![0]} measurement={measurement}/>)).toBe('');
});
it('hides destination glyphs without removing layout and reveals them on arrival',()=>{
 const render=(t:number)=>renderToStaticMarkup(<StudioMath tex={String.raw`(\p{a}{1}x+\p{b}{2})`} itemId="fac" state={state(t)}/>);
 expect(render(999)).toMatch(/data-stage-target="item:fac\/a"[^>]*opacity:0/);
 expect(render(1700)).toMatch(/data-stage-target="item:fac\/a"[^>]*opacity:1/);
 expect(render(1700)).toMatch(/data-stage-target="item:fac\/b"[^>]*opacity:0/);
 expect(readFileSync('components/studio/move.module.css','utf8')).toContain('prefers-reduced-motion: reduce');
});
it('uses an upward 15% arc and linear size interpolation with exact endpoints',()=>{
 const from=labelBox(0,0,20,30),to=labelBox(100,0,40,60),mid=moveGeometry(from,to,.5);
 expect(moveGeometry(from,to,0)).toEqual({left:0,top:0,width:20,height:30});
 expect(moveGeometry(from,to,1)).toEqual({left:100,top:0,width:40,height:60});
 expect(mid.width).toBe(30);expect(mid.height).toBe(45);expect(mid.top).toBeLessThan(0);
});
it.each([.3,.5,1])('maps actual DOM positions without double scaling at %s',scale=>{
 const root={left:10,top:20,right:10+1000*scale,bottom:20+600*scale,width:1000*scale,height:600*scale} as DOMRect;
 const rect={left:10+30*scale,top:20+60*scale,right:10+50*scale,bottom:20+90*scale} as DOMRect;
 expect(measuredMoveBox(rect,root,1000,600)).toEqual(labelBox(30,60,20,30));
});
it.each(Array.from({length:20},(_,i)=>'rm-'+String(i+1).padStart(2,'0')))('keeps authored %s scenes renderable with every move landed at scene end',id=>{
 const lesson=lessonSchema.parse(JSON.parse(readFileSync('content/lessons/'+id+'.json','utf8')));
 for(const scene of lesson.scenes){const starts=scene.narration.map((_,i)=>i*20000),s=stageStateAt(scene,starts.at(-1)!+19000,starts);
  const html=renderToStaticMarkup(<ChalkSurface scene={scene} state={s} marks={s.chalk??[]} revision={scene.id}><StudioStage scene={scene} state={s} onWhy={()=>{}} onTrace={()=>{}} onQuiz={()=>{}}/></ChalkSurface>);
  expect(html).not.toContain('data-move-clone');expect((s.moves??[]).filter(m=>m.flying||!m.arrived)).toEqual([]);
 }
});

it('keeps all constant-six factor pairs in one compact group, separate from four',()=>{
 if(moveFixture.stage.type!=='board')throw new Error('board fixture expected');
 const items=moveFixture.stage.items;
 expect(items.filter(item=>item.group==='six').map(item=>item.id)).toEqual(['fb','fbr']);
 expect(items.find(item=>item.id==='fa')?.group).toBe('four');
 expect(items.find(item=>item.id==='fbr')?.position).toBeUndefined();
 expect(actionErrors(moveFixture)).toEqual([]);
 const css=readFileSync('components/studio/items.module.css','utf8');
 expect(css).toContain('(max-width: 767px) and (orientation: portrait)');
 expect(css).toContain('calc(var(--studio-type-xl) * .8)');
});
