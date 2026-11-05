import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RegionLayer } from '@/components/studio/RegionLayer';
import { StudioGraph } from '@/components/studio/StudioGraph';
import { GraphPointLabels } from '@/components/studio/GraphPointLabels';
import { regionSchema, type RegionAction, type RegionMark } from './region-schema';
import { intersectRegions, placeRegionLabels, regionGeometry, regionProgress, regionTargets, regionPointLabelObstacles } from './region';
import { labelBox, overlaps, placePointLabels } from './point-labels';
import { studioDemo } from './studio-demo';
import { stageStateAt } from './stage-state-at';
import { actionErrors, actionWarnings } from './action-validation';
import { lessonSchema, type Scene } from './schema';
import { validateAuthoredMath } from './authored-math';
import { equalGraph } from './equal-graph';
import type { Action } from './action-schema';

const scene = studioDemo.scenes.find(scene => scene.id === 'inequality-regions')!;
const a: RegionAction = { type:'region', id:'a', ranges:[{from:-1,to:2,open:'to'}] };
const b: RegionAction = { type:'region', id:'b', level:2, color:'mint', ranges:[{from:'-inf',to:0},{from:1,to:'inf'}], intersect_with:'a' };
const sx = (x: number) => 100 + x * 20;
const mark = (action: RegionAction): RegionMark => ({ id:action.id!, action, elapsed:1000, opacity:1 });
const geometry = (action: RegionAction) => regionGeometry(mark(action),sx,100,[-3,3]);
it('rm-06 s5: a labelled −7 endpoint avoids region lines, markers and label, preferring south', () => {
  const regions = regionGeometry(mark({type:'region',id:'sol',ranges:[{from:'-inf',to:-7}],label:'x \\le -7'}), x => 400 + x * 20, 140, [-12,0]);
  const regionLabel = labelBox(220,80,110,28);
  // A tall tick blocks the usual south slot; the second south slot must win over north.
  const tick = labelBox(246,150,28,45);
  const boxes = {'label:p':labelBox(0,0,30,24),'tick:-7':tick,'region-label:sol':regionLabel};
  const shapes = regionPointLabelObstacles(regions);
  expect(shapes.some(box => overlaps(box,labelBox(260,139,1,1)))).toBe(true);
  expect(shapes.some(box => overlaps(box,labelBox(200,112,1,1)))).toBe(true);
  expect(shapes.some(box => overlaps(box,labelBox(260,120,1,1)))).toBe(true);
  const viewport = labelBox(0,0,500,300);
  const result = placePointLabels([{id:'p',x:260,y:140,width:30,height:24,preferSouth:true}], [...shapes,tick,regionLabel], viewport, true).p;
  expect(result.mode).toBe('stack');
  expect(result.box.top).toBe(202);
  expect([...shapes,tick,regionLabel].some(box => overlaps(box,result.box))).toBe(false);
  const html = renderToStaticMarkup(<svg><GraphPointLabels points={[{id:'p',x:-7,y:0,c:'c1',label:'auto'}]} boxes={boxes} sx={x=>400+x*20} sy={()=>140} viewport={viewport} numberLine regions={regions} opacity={()=>1}/></svg>);
  expect(html).toContain('data-label-mode="stack"');
  expect(html).toContain('y="202"');
  // If both ordinary slots are blocked, region label must also be avoided by leader placement.
  const blocked = {...boxes,'tick:-7':labelBox(240,150,50,100)};
  const avoided = renderToStaticMarkup(<svg><GraphPointLabels points={[{id:'p',x:-7,y:0,c:'c1',label:'auto'}]} boxes={blocked} sx={x=>400+x*20} sy={()=>140} viewport={viewport} numberLine regions={regions} opacity={()=>1}/></svg>);
  expect(avoided).toContain('data-label-mode="leader"');
});
function withActions(actions: Action[]): Scene { return {...scene,narration:[{id:'one',role:'say',text:'조건을 봅니다',cue:{actions}}]}; }
function render(actions: Action[]) {
  const state = stageStateAt(withActions(actions),1000,[0]);
  const geometries = Object.fromEntries(state.regions!.map(mark => [mark.id,regionGeometry(mark,sx,100,[-3,3])]));
  return renderToStaticMarkup(<svg><RegionLayer state={state} geometries={geometries} boxes={{}} sx={sx} axisY={100} domain={[-3,3]}/></svg>);
}

it('parses constant-expression endpoints, infinity and default level', () => {
  const result = regionSchema.parse({type:'region',ranges:[{from:'-sqrt(2)',to:'3/2'},{from:2,to:'inf'}]});
  expect(result.ranges[0]).toEqual({from:-Math.sqrt(2),to:1.5});
  expect(geometry(result)[0].y).toBe(72);
});
it.each([
  {ranges:[]}, {ranges:[{from:2,to:1}]}, {ranges:[{from:'inf',to:'inf'}]},
  {ranges:[{from:'-inf',to:'-inf'}]}, {ranges:[{from:0,to:0,open:'both'}]},
  {level:0}, {level:1.5}, {ranges:[{from:'x',to:2}]},
])('rejects malformed region %j', patch => {
  expect(regionSchema.safeParse({...a,...patch}).success).toBe(false);
});
it('renders filled and open 10px endpoint circles at the axis', () => {
  const html = render([a]);
  expect(html).toContain('data-region-end="from" data-open="false"');
  expect(html).toContain('data-region-end="to" data-open="true"');
  expect((html.match(/r="5"/g)??[])).toHaveLength(2);
  expect(html).toContain('cy="100"');
});
it('keeps disjoint ranges at one level and puts a second condition 28px higher', () => {
  expect(geometry(a)[0].y).toBe(72);
  expect(geometry(b).map(range=>range.y)).toEqual([44,44]);
});
it('uses arrows at infinity without circles or vertical segments there', () => {
  const html = render([b]);
  expect(html).toContain('data-region-arrow="left"');
  expect(html).toContain('data-region-arrow="right"');
  expect((html.match(/<circle/g)??[])).toHaveLength(2);
  expect((html.match(/data-region-vertical/g)??[])).toHaveLength(2);
  const ranges = geometry(b);
  expect(ranges[0]).toMatchObject({left:40,fromMarker:false,leftArrow:true});
  expect(ranges[1]).toMatchObject({right:160,toMarker:false,rightArrow:true});
});
it('renders a singleton as one filled circle without a raised step', () => {
  const singleton = {...a,ranges:[{from:1,to:1}]};
  expect(regionSchema.safeParse(singleton).success).toBe(true);
  const html = render([singleton]);
  expect((html.match(/<circle/g)??[])).toHaveLength(1);
  expect(html).not.toContain('data-region-horizontal');
  expect(geometry(singleton)[0].box).toEqual(labelBox(115,95,10,10));
});
it('clips offscreen finite endpoints without inventing boundary circles or infinity arrows', () => {
  const range = geometry({...a,ranges:[{from:-5,to:5}]})[0];
  expect(range).toMatchObject({left:40,right:160,fromMarker:false,toMarker:false,leftArrow:false,rightArrow:false});
  expect(geometry({...a,ranges:[{from:7,to:9}]})).toEqual([]);
  expect(geometry({...a,ranges:[{from:-8,to:-7},{from:0,to:1}]})).toMatchObject([{index:1,order:1}]);
});
it('computes the example intersection while retaining open endpoints', () => {
  expect(intersectRegions(a.ranges,b.ranges)).toEqual([
    {from:-1,to:0,openFrom:false,openTo:false}, {from:1,to:2,openFrom:false,openTo:true},
  ]);
  expect(render([a,b])).toContain('data-open-to="true"');
});
it('draws intersection bands only when intersect_with is explicitly set', () => {
  expect(render([{...a,id:undefined}])).not.toContain('data-region-intersection');
  expect(render([{...a,id:undefined},a])).not.toContain('data-region-intersection');
});
it('excludes open touching boundaries, retains closed singleton intersections and unions duplicate bands', () => {
  expect(intersectRegions([{from:0,to:1,open:'to'}],[{from:1,to:2}])).toEqual([]);
  expect(intersectRegions([{from:0,to:1}],[{from:1,to:2}])).toEqual([{from:1,to:1,openFrom:false,openTo:false}]);
  expect(intersectRegions([{from:0,to:2},{from:1,to:3}],[{from:'-inf',to:'inf'}])).toEqual([{from:0,to:3,openFrom:false,openTo:false}]);
  expect(intersectRegions([{from:0,to:1,open:'to'},{from:1,to:2,open:'from'}],[{from:'-inf',to:'inf'}])).toHaveLength(2);
});
it('draws leftmost ranges sequentially within 400ms', () => {
  expect(regionProgress(20,0,2)).toEqual({marker:.5,vertical:0,horizontal:0});
  expect(regionProgress(150,0,2).horizontal).toBe(.5);
  expect(regionProgress(150,1,2).marker).toBe(0);
  expect(regionProgress(400,1,2)).toEqual({marker:1,vertical:1,horizontal:1});
  expect(geometry({...a,ranges:[{from:1,to:2},{from:-2,to:-1}]}).map(range=>range.index)).toEqual([1,0]);
});
it('persists regions by default, clears selectively, expires TTL, and rewinds deterministically', () => {
  const scene = withActions([a,{...b,ttl_ms:600},{type:'tint',target:'region:a',color:'mark'},
    {type:'clear',what:'region',at_ms:700},{...a,id:'c',at_ms:800},{type:'clear',what:'all',at_ms:900}]);
  expect(stageStateAt(scene,500,[0]).regions).toHaveLength(2);
  expect(stageStateAt(scene,600,[0]).regions).toHaveLength(1);
  expect(stageStateAt(scene,700,[0]).regions).toHaveLength(0);
  expect(stageStateAt(scene,700,[0]).tints).toEqual({'region:a':'mark'});
  expect(stageStateAt(scene,850,[0]).regions).toHaveLength(1);
  expect(stageStateAt(scene,900,[0]).regions).toHaveLength(0);
  expect(stageStateAt(scene,900,[0]).tints).toEqual({});
  expect(stageStateAt(scene,500,[0])).toEqual(stageStateAt(scene,500,[0]));
  expect(stageStateAt(withActions([a]),100000,[0]).regions).toHaveLength(1);
});
it('validates number-line stages, IDs, intersection references and whole/range targets', () => {
  expect(actionErrors(withActions([a,b,{type:'pointer',target:'region:a'}, {type:'circle',target:'region:b/1'},
    {type:'underline',target:'region:a/0'}, {type:'highlight',target:'region:b'}, {type:'tint',target:'region:a/0',color:'mint'}]))).toEqual([]);
  expect(actionErrors(withActions([a,a])).join()).toContain('중복');
  expect(actionErrors(withActions([{...a,intersect_with:'missing'}])).join()).toContain('참조');
  expect(actionErrors(withActions([a,{type:'pointer',target:'region:a/1'}])).join()).toContain('범위');
  const graph = withActions([a]);
  if(graph.stage.type!=='graph')throw Error('fixture');
  graph.stage={...graph.stage,number_line:false};
  expect(actionErrors(graph).join()).toContain('number_line');
  expect(lessonSchema.safeParse({...studioDemo,scenes:[graph]}).success).toBe(false);
});
it('warns only for overlapping lifetimes at the same level, respecting clear and TTL', () => {
  expect(actionWarnings(withActions([a,{...b,level:1}])).join()).toContain('level 1');
  expect(actionWarnings(withActions([a,b]))).toEqual([]);
  expect(actionWarnings(withActions([{...a,ttl_ms:200},{...b,level:1,at_ms:200}]))).toEqual([]);
  expect(actionWarnings(withActions([a,{type:'clear',what:'region',at_ms:100},{...b,level:1,at_ms:200}]))).toEqual([]);
});
it('exposes whole-step and range bounding boxes for pointing and tint', () => {
  const targets = regionTargets([mark(b)],{b:geometry(b)});
  expect(targets['region:b'].left).toBe(40);
  expect(targets['region:b'].right).toBe(160);
  expect(targets['region:b'].top).toBe(40);
  expect(targets['region:b/1'].bottom).toBe(105);
  const html=render([a,{type:'tint',target:'region:a/0',color:'hand'}]);
  expect(html).toContain('color:var(--studio-tint-hand)');
  const state=stageStateAt(withActions([a,{type:'underline',target:'region:a',ttl_ms:0}]),1000,[0]);
  expect(renderToStaticMarkup(<StudioGraph fns={[]} aria="수직선" numberLine state={state}/>)).toMatch(/data-chalk="underline"[\s\S]*?<path/);
});
it('moves colliding measured region labels upward and preserves eight-pixel clearance', () => {
  const labels=[{id:'a',x:100,bottom:64,width:100,height:30},{id:'b',x:100,bottom:36,width:120,height:30}];
  const result=placeRegionLabels(labels,[]);
  expect(result.b.bottom).toBe(36);
  expect(result.a.bottom).toBeLessThan(result.b.top);
  expect(placeRegionLabels(labels,[])).toEqual(result);
});
it('reserves level headroom by moving a high camera axis down without changing x scale', () => {
  const camera={x:[-3,3] as [number,number],y:[-10,-8] as [number,number]}, viewport={width:390,height:240,left:30,right:24,top:24,bottom:28};
  const original=equalGraph(camera,viewport,'equal',true),reserved=equalGraph(camera,viewport,'equal',true,96);
  expect(reserved.sy(0)).toBeCloseTo(120);
  expect(reserved.sx(2)).toBe(original.sx(2));
  expect(equalGraph(camera,viewport,'equal',false,96).y).toEqual(equalGraph(camera,viewport,'equal',false).y);
});
it('checks authored labels and the demonstration without changing production content', () => {
  expect(lessonSchema.safeParse(studioDemo).success).toBe(true);
  expect(()=>validateAuthoredMath(studioDemo)).not.toThrow();
  expect(()=>validateAuthoredMath({...studioDemo,scenes:[withActions([{...a,label:'\\unknowncommand'}])]})).toThrow();
});
