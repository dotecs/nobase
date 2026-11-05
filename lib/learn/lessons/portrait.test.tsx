import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {overlayCoordinates} from './overlay-coordinates';
import {localTargetBox} from '@/components/studio/useTargetBoxes';
import {portraitItems,portraitLayout,wrapTerms} from './portrait-layout';
import {nearBox,positionSchema} from './position';
import {labelBox,overlaps} from './point-labels';
import {actionSchema} from './action-schema';
import {actionErrors} from './action-validation';
import {itemPosition,itemsSchema} from './items';
import {StageLayoutContext} from '@/components/studio/StageLayout';
import {StudioStage} from '@/components/studio/stages/StudioStage';
import {studioDemo} from './studio-demo';
import {stageStateAt} from './stage-state-at';
import {calloutGeometry} from './callout';
import {regionGeometry} from './region';
import type {Scene} from './schema';
import {readFileSync} from 'node:fs';

it.each([.3,.5,1])('maps scaled and letterboxed DOM targets into overlay units at scale %s',scale=>{
  const mapping=overlayCoordinates({left:123,top:51,width:1280*scale,height:800*scale},{x:0,y:0,width:1280,height:720});
  const source=labelBox(350,220,90,48),a=mapping.toClient(source.left,source.top),b=mapping.toClient(source.right,source.bottom);
  const measured=localTargetBox({left:a.x,top:a.y,right:b.x,bottom:b.y},mapping.toLocal);
  for(const key of ['left','right','top','bottom','x','y'] as const)expect(Math.abs(source[key]-measured[key])).toBeLessThan(.001);
  const screen=mapping.toClient(measured.x,measured.y),expected=mapping.toClient(source.x,source.y);
  expect(Math.hypot(screen.x-expected.x,screen.y-expected.y)).toBeLessThan(1);
});
it('wraps whole terms including their operator without exceeding the available row width',()=>{
  const widths=[80,110,90,45],rows=wrapTerms(widths,240,12);
  expect(rows).toEqual([[0,1],[2,3]]);
  expect(rows.every(row=>row.reduce((sum,i)=>sum+widths[i],0)+12*(row.length-1)<=240)).toBe(true);
});
it('places groups first and respects stable order for standalone notes',()=>{
  const items=itemsSchema.parse([{id:'note',text:'안내',position:{x:.5,y:.9},order:4,kind:'note'},{id:'a',tex:'a',group:'expr',position:{x:.5,y:.2}},{id:'b',tex:'+b',group:'expr'},{id:'first',text:'먼저',position:{x:.5,y:.8},order:1}]);
  expect(portraitItems(items).map(i=>i.id)).toEqual(['a','b','first','note']);
  const layout=portraitLayout(390,0,items,{},[]);
  expect(layout.items['item:note'].right-layout.items['item:note'].left).toBe(366);
  expect(layout.items['item:first'].top).toBeLessThan(layout.items['item:note'].top);
});
it.each(['below','above','left','right'] as const)('places near positions on the %s side',side=>{
  const source=labelBox(100,100,80,40),box=nearBox(source,30,20,side,12);
  expect(side==='below'?box.top-source.bottom:side==='above'?source.top-box.bottom:side==='left'?source.left-box.right:box.left-source.right).toBe(12);
  expect(positionSchema.parse({near:'item:a',side,gap:12})).toEqual({near:'item:a',side,gap:12});
});
it('stacks notes targeting the same item without overlapping items or each other',()=>{
  const items=itemsSchema.parse([{id:'a',tex:'a',position:{x:0,y:0}},{id:'b',tex:'b',position:{x:1,y:1}}]);
  const layout=portraitLayout(390,0,items,{'item:a':labelBox(0,0,40,34),'item:b':labelBox(0,0,40,34)},[
    {id:'one',target:'item:a',side:'below',gap:16,width:160,height:30},
    {id:'two',target:'item:a',side:'below',gap:16,width:160,height:30},
  ]);
  expect(layout.notes.one.top-layout.items['item:a'].bottom).toBe(16);
  const boxes=[...Object.values(layout.items),...Object.values(layout.notes)];
  expect(boxes.some((box,i)=>boxes.slice(i+1).some(other=>overlaps(box,other,0)))).toBe(false);
});
it('uses glyph offsets for part-relative notes and stacks pure memos in appearance order',()=>{
  const items=itemsSchema.parse([{id:'a',tex:'a',position:{x:0,y:0}}]);
  const layout=portraitLayout(390,0,items,{'item:a':labelBox(200,200,100,40),'item:a/exp':labelBox(260,200,12,15)},[
    {id:'part',target:'item:a/exp',side:'above',gap:12,width:80,height:26},
    {id:'memo:1',gap:12,width:100,height:26},{id:'memo:2',gap:12,width:100,height:52},
  ]);
  expect(layout.notes.part.x).toBeCloseTo(layout.items['item:a'].left+66);
  expect(layout.notes['memo:2'].top).toBeGreaterThan(layout.notes['memo:1'].bottom);
});
it('parses near for items, callouts and handwriting and checks reference IDs',()=>{
  const items=itemsSchema.parse([{id:'a',tex:'A',position:{x:.5,y:.4}},{id:'b',tex:'B',position:{near:'item:a',side:'below',gap:12}}]);
  const action=actionSchema.parse({type:'handwrite',text:'좌변',position:{near:'item:a'}});
  const callout=actionSchema.parse({type:'callout',target:'item:a',text:'설명',position:{near:'item:a',side:'below'}});
  const scene:Scene={...studioDemo.scenes[0],stage:{type:'board',items},narration:[{id:'s1',role:'say',text:'설명',cue:{actions:[action,callout]}}]};
  expect(actionErrors(scene)).toEqual([]);
  expect(itemPosition(items[1],{sx:x=>x,sy:y=>y,target:id=>id==='item:a'?labelBox(100,100,40,20):labelBox(0,0,30,20)})).toEqual({x:120,y:132});
  scene.narration[0].cue!.actions=[{type:'handwrite',text:'설명',position:{near:'item:missing'}}];
  expect(actionErrors(scene)).toContain('near 대상 범위 오류');
  expect(positionSchema.safeParse({near:'x',gap:-1}).success).toBe(false);
});
it('turns tables with three columns into cards without changing target IDs or desktop markup',()=>{
  const scene=studioDemo.scenes.find(s=>s.id==='precision-cancellation')!,state=stageStateAt(scene,500,[0,3000]),props={scene,state,onWhy:()=>{},onTrace:()=>{},onQuiz:()=>{}};
  const mobile=renderToStaticMarkup(<StageLayoutContext.Provider value><StudioStage {...props}/></StageLayoutContext.Provider>);
  const desktop=renderToStaticMarkup(<StudioStage {...props}/>);
  expect(mobile).toContain('<article');expect(mobile).not.toContain('<table>');
  expect(mobile).toContain('data-stage-target="cell:0:2/n1"');expect(desktop).toContain('<table>');
});
it('uses compact callout lines and a 20px region level without changing desktop values',()=>{
  const source=labelBox(100,100,40,30),note=nearBox(source,60,30,'below',16);
  const action=actionSchema.parse({type:'callout',target:'item:a',position:{x:0,y:0},text:'설명'});
  if(action.type!=='callout')throw Error('type');
  const compact=calloutGeometry(action,source,note,true);
  expect(compact.points).toHaveLength(2);expect(compact.end.y-compact.dot.y).toBe(12);
  const mark={id:'r',action:{type:'region' as const,ranges:[{from:0,to:2}],level:2},elapsed:500,opacity:1};
  expect(regionGeometry(mark,x=>x*20,100,[-3,3],20)[0].y).toBe(60);
  expect(regionGeometry(mark,x=>x*20,100,[-3,3])[0].y).toBe(44);
});
it('keeps portrait strokes in screen pixels and defines the portrait type ladder',()=>{
  expect(readFileSync('components/studio/chalk.module.css','utf8')).toContain('vector-effect:non-scaling-stroke');
  const css=readFileSync('components/studio/studio.module.css','utf8');
  for(const size of ['--studio-type-xl:30px','--studio-type-lg:24px','--studio-type-md:18px','--studio-type-sm:15px','--studio-type-hand:20px'])expect(css).toContain(size);
});
