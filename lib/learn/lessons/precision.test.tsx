import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudioStage } from '@/components/studio/stages/StudioStage';
import { CalloutLayer } from '@/components/studio/CalloutLayer';
import { ChalkLayer } from '@/components/studio/ChalkLayer';
import { localTargetBox } from '@/components/studio/useTargetBoxes';
import { studioDemo } from './studio-demo';
import { lessonSchema, type Scene } from './schema';
import { stageStateAt } from './stage-state-at';
import { validateAuthoredMath } from './authored-math';
import { actionErrors, actionWarnings } from './action-validation';
import { actionSchema, type Action } from './action-schema';
import { actionExpiry } from './action-lifetime';
import { stageTargetIds } from './stage-targets';
import { chalkAt } from './chalk';
import { strikeTargets, strikePoints } from './strike';
import { labelBox } from './point-labels';
import { instructionColor, targetOpacity } from './instruction-style';

const tex = String.raw`\p{coef}{3}x + \p{one}{1}`;
const callbacks = {onWhy:()=>{},onTrace:()=>{},onQuiz:()=>{}};
const demo = studioDemo.scenes.find(scene=>scene.id==='precision-cancellation')!;
const stages: [string, Scene['stage'], string, Action[]][] = [
  ['cell',{type:'table',columns:['식'],rows:[{cells:[`$${tex}$ 그리고 $\\p{two}{2}$`]}]},'cell:0:0',[{type:'reveal',target:'row',index:0}]],
  ['step',{type:'steps',steps:[{tex}]},'step:0',[{type:'reveal',target:'step',index:0}]],
  ['node',{type:'chain',nodes:[{tex,text:'설명'}]},'node:0',[{type:'reveal',target:'node',index:0}]],
  ['tree',{type:'tree',direction:'right',root:{id:'root',label:'식',tex}},'tree:root',[]],
];
function fixture(stage:Scene['stage'],actions:Action[]=[]):Scene {
  return {id:'s',title:'정밀 지시',tag:'derive',stage,narration:[{id:'s1',role:'say',text:'하나씩 표시해요',cue:{actions}},{id:'s2',role:'say',text:'다음 문장이에요'}]};
}
function lesson(scene: Scene) { return {...studioDemo,scenes:[scene]}; }

it.each(stages)('renders and measures %s math parts and validates their references',(_name,stage,target,reveals)=>{
  const scene=fixture(stage,[...reveals,{type:'circle',target:target+'/coef'},{type:'tint',target:target+'/one',color:'mint'}]);
  expect(actionErrors(scene)).toEqual([]);
  expect(stageTargetIds(stage).has(target+'/coef')).toBe(true);
  expect(()=>validateAuthoredMath(lessonSchema.parse(lesson(scene)))).not.toThrow();
  const state=stageStateAt(scene,500,[0,3000]);
  const html=renderToStaticMarkup(<StudioStage scene={scene} state={state} {...callbacks}/>);
  expect(html).toContain(`data-stage-target="${target}/coef"`);
  expect(html).toContain('color:var(--studio-tint-mint)');
  const box=localTargetBox({left:120,right:140,top:60,bottom:90},(x,y)=>({x:x/2,y:y/2}));
  expect(box).toEqual(labelBox(60,30,10,15));
  const chalk=renderToStaticMarkup(<svg><ChalkLayer marks={state.chalk!} space={{sx:x=>x,sy:y=>y,x:[0,300],y:[0,300],target:id=>id===target+'/coef'?box:null}}/></svg>);
  expect(chalk).toContain('data-chalk="circle"');
  expect(chalk).toContain('M82.00,37.50');
});
it('renders named callout parts without treating their own glyphs as layout obstacles',()=>{
  const action:Action={type:'callout',id:'note',from:{x:.1,y:.1},position:{x:.5,y:.5},tex};
  const scene=fixture({type:'board',items:[]},[action,{type:'circle',target:'item:note/one'},{type:'tint',target:'item:note/one',color:'mint'}]);
  expect(actionErrors(scene)).toEqual([]);
  expect(()=>validateAuthoredMath(lessonSchema.parse(lesson(scene)))).not.toThrow();
  const state=stageStateAt(scene,500,[0,3000]);
  const html=renderToStaticMarkup(<svg><CalloutLayer state={state} boxes={{'item:note':labelBox(40,40,20,20),'item:note/one':labelBox(50,40,10,20)}} space={{sx:x=>100*x,sy:y=>100*y,x:[0,1],y:[0,1],target:()=>null}}/></svg>);
  expect(html).toContain('data-stage-target="item:note/one"');
  expect(html).toContain('color:var(--studio-tint-mint)');
  expect(html).toContain('x="40" y="50"');
});
it.each(stages)('rejects duplicate %s names, including separate math spans in one cell',(_name,stage)=>{
  const duplicate=JSON.parse(JSON.stringify(stage).replaceAll('\\\\p{one}', '\\\\p{coef}')) as Scene['stage'];
  expect(()=>lessonSchema.parse(lesson(fixture(duplicate)))).toThrow('부분 이름 중복');
  if(stage.type==='table'){
    const across={...stage,rows:[{cells:['$\\p{a}{a}$ 그리고 $\\p{a}{b}$']}]};
    expect(()=>lessonSchema.parse(lesson(fixture(across)))).toThrow('부분 이름 중복');
  }
});
it('rejects duplicate callout parts and unknown strike targets',()=>{
  const scene=fixture({type:'board',items:[]},[{type:'callout',id:'note',from:{x:0,y:0},position:{x:.5,y:.5},tex:String.raw`\p{a}{1}+\p{a}{2}`}]);
  expect(actionErrors(scene)).toContain('부분 이름 중복: item:note');
  expect(actionErrors(fixture(demo.stage,[{type:'strike',targets:['cell:0:2/missing']}]))).toContain('strike 대상 범위 오류');
});
it('requires exactly one nonempty strike input and validates direction',()=>{
  for(const patch of [{},{targets:[]},{pairs:[['x']]},{target:'a',targets:['b']},{target:'a',direction:'x'},{target:'a',stagger_ms:-1}])expect(actionSchema.safeParse({type:'strike',...patch}).success).toBe(false);
  expect(actionSchema.safeParse({type:'strike',target:'cell:0:2/one',direction:'\\'}).success).toBe(true);
});
it('draws strikes in authored sequence with default 200ms stagger and simultaneous pairs',()=>{
  const seq={type:'strike' as const,targets:['n1','n2','n3']};
  expect(strikeTargets(seq,199)).toEqual([{target:'n1',progress:.4975}]);
  expect(strikeTargets(seq,400)).toEqual([{target:'n1',progress:1},{target:'n2',progress:.5},{target:'n3',progress:0}]);
  const paired={type:'strike' as const,pairs:[['n1','d1'],['n2','d2']] as [string,string][],stagger_ms:220};
  expect(strikeTargets(paired,219)).toHaveLength(2);
  expect(strikeTargets(paired,420).map(value=>value.progress)).toEqual([1,1,.5,.5]);
});
it('extends either diagonal by exactly 4px per end and renders Stroke at 2.5px',()=>{
  const box=labelBox(10,20,30,40);
  for(const direction of ['/', '\\'] as const){
    const points=strikePoints(box,direction),first=points[0],last=points.at(-1)!;
    expect(Math.hypot(last.x-first.x,last.y-first.y)).toBeCloseTo(58);
    expect(direction==='/'?first.y>last.y:first.y<last.y).toBe(true);
  }
  const mark=chalkAt({type:'strike',target:'one'},0,500,'s',3000)!;
  const html=renderToStaticMarkup(<svg><ChalkLayer marks={[mark]} space={{sx:x=>x,sy:y=>y,x:[0,100],y:[0,100],target:()=>box}}/></svg>);
  expect(html).toContain('stroke-width="2.5"');
  expect(html).toContain('stroke-dashoffset:0');
});
it.each(['pointer','circle','underline','strike','arrow','flash','tint'])('%s defaults to sentence end, respects ttl and explicit until',type=>{
  expect(actionExpiry({type},100,1000)).toBe(1000);
  expect(actionExpiry({type,ttl_ms:300},100,1000)).toBe(400);
  expect(actionExpiry({type,ttl_ms:5000},100,1000)).toBe(1000);
  expect(actionExpiry({type,ttl_ms:0},100,1000)).toBe(Infinity);
  expect(actionExpiry({type,ttl_ms:0,until:'sentence'},100,1000)).toBe(1000);
  expect(actionExpiry({type,until:'scene'},100,1000)).toBe(type==='pointer'?2600:Infinity);
});
it('retains written content and structural highlights but expires a single part highlight',()=>{
  for(const type of ['handwrite','callout','region','bracket','shade'])expect(actionExpiry({type},0,1000)).toBe(Infinity);
  expect(actionExpiry({type:'highlight',target:'cell:0:2/one'},0,1000)).toBe(1000);
  for(const target of ['step:0','row:0','node:0',['cell:0:2/one']])expect(actionExpiry({type:'highlight',target},0,1000)).toBe(Infinity);
});
it('fades over the final 200ms, clears at the next audio start and replays deterministically',()=>{
  const scene=fixture(demo.stage,[{type:'strike',targets:['cell:0:2/n1','cell:0:2/d1']},{type:'circle',target:'cell:0:2/one',at_ms:500},{type:'tint',target:'cell:0:2/one',color:'mint'},{type:'highlight',target:'cell:0:2/one'}]);
  const options={durations:{s1:9999,s2:1500}};
  const before=stageStateAt(scene,900,[0,1000],options);
  expect(before.chalk!.map(mark=>mark.opacity)).toEqual([.5,.5]);
  expect(before.tintOpacity?.['cell:0:2/one']).toBe(.5);
  expect(before.highlightOpacity).toBe(.5);
  expect(instructionColor(before,'cell:0:2/one')).toContain('50%');
  expect(targetOpacity(before,'cell:0:2')).toBe(1);
  expect(targetOpacity(before,'cell:0:1')).toBe(.625);
  const after=stageStateAt(scene,1000,[0,1000],options);
  expect(after.chalk).toEqual([]);expect(after.tints).toEqual({});expect(after.highlight).toBeNull();
  expect(stageStateAt(scene,900,[0,1000],options)).toEqual(before);
  const last={...scene,narration:[scene.narration[0]]};
  expect(stageStateAt(last,1000,[0],{durations:{s1:1000}}).chalk).toEqual([]);
});
it('does not resurrect an older tint/highlight when a newer short instruction expires',()=>{
  const scene=fixture(demo.stage,[{type:'tint',target:'cell:0:2/one',color:'mint',until:'scene'},{type:'tint',target:'cell:0:2/one',color:'mark',ttl_ms:100,at_ms:500},{type:'highlight',target:'row:0'},{type:'highlight',target:'cell:0:2/one',ttl_ms:100,at_ms:500}]);
  const state=stageStateAt(scene,700,[0,1000]);expect(state.tints).toEqual({});expect(state.highlight).toBeNull();
});
it('warns about legacy ttl zero instructions unless scene intent is explicit',()=>{
  const scene=fixture(demo.stage,[{type:'circle',target:'cell:0:2/one',ttl_ms:0},{type:'underline',target:'row:0',ttl_ms:0,until:'scene'}]);
  expect(actionWarnings(scene)).toHaveLength(1);
  expect(actionWarnings(scene)[0]).toContain('장면 끝까지 남는 지시');
});
it('demo draws six cancelling factors then circles exactly one and clears in the next sentence',()=>{
  expect(()=>validateAuthoredMath(lessonSchema.parse(lesson(demo)))).not.toThrow();
  const state=stageStateAt(demo,6000,[0,9000],{durations:{'precision-1':9000}});
  const strike=state.chalk!.find(mark=>mark.action.type==='strike')!;
  expect(strike.action.type==='strike'&&strikeTargets(strike.action,strike.elapsed)).toHaveLength(6);
  expect(state.chalk!.find(mark=>mark.action.type==='circle')?.action).toMatchObject({target:'cell:0:2/one'});
  expect(stageStateAt(demo,9000,[0,9000]).chalk).toEqual([]);
});
