import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { BoardItems } from '@/components/studio/BoardItems';
import { CalloutLayer } from '@/components/studio/CalloutLayer';
import { annotationColor, calloutSchema, type CalloutAction } from './annotation-schema';
import { calloutGeometry, placeCallouts } from './callout';
import { labelBox } from './point-labels';
import { actionErrors } from './action-validation';
import { itemErrors, itemsOf } from './items';
import { studioDemo } from './studio-demo';
import { lessonSchema } from './schema';
import { stageStateAt } from './stage-state-at';
import type { Action } from './action-schema';

const scene = studioDemo.scenes.find(scene => scene.id === 'expression-callout')!;
const callout: CalloutAction = { type:'callout', id:'c1', target:'item:t1', tex:'4x^3', position:{x:.4,y:.6} };
function run(actions: Action[], time: number) {
  return stageStateAt({...scene,narration:[{id:'one',role:'say',text:'설명',cue:{actions}}]},time,[0]);
}

it('keeps tint and callout by default and deterministically clears and rewinds them', () => {
  const actions:Action[]=[{type:'tint',target:'item:t1',color:'mint'},callout,{type:'tint',target:'item:t2',color:'mark'},
    {type:'clear',what:'tint',at_ms:2000},{type:'clear',what:'all',at_ms:3000}];
  expect(run(actions,1900).tints).toEqual({'item:t1':'mint','item:t2':'mark'});
  expect(run(actions,2000).tints).toEqual({});
  expect(run(actions,2000).callouts).toHaveLength(1);
  expect(run(actions,3000).callouts).toEqual([]);
  expect(run(actions,1900)).toEqual(run(actions,1900));
  expect(run([callout],100000).callouts).toHaveLength(1);
});

it('expires explicit tint and callout TTL at the exact boundary', () => {
  const actions:Action[]=[{...callout,ttl_ms:500},{type:'tint',target:'item:t1',color:'hand',ttl_ms:500}];
  expect(run(actions,499).callouts).toHaveLength(1);
  expect(run(actions,500).callouts).toEqual([]);
  expect(run(actions,500).tints).toEqual({});
});

it.each([
  ['bottom',{x:50,y:66},{x:50,y:90},{x:250,y:90},{x:250,y:194}],
  ['top',{x:50,y:14},{x:50,y:-10},{x:250,y:-10},{x:250,y:246}],
  ['left',{x:14,y:40},{x:-10,y:40},{x:-10,y:220},{x:306,y:220}],
  ['right',{x:86,y:40},{x:110,y:40},{x:110,y:220},{x:194,y:220}],
] as const)('draws %s anchor dot 6px outside and a 9px arrowhead', (anchor,dot,turn,corner,end) => {
  const geometry=calloutGeometry({...callout,anchor},labelBox(20,20,60,40),labelBox(200,200,100,40));
  expect(geometry.points).toEqual([dot,turn,corner,end]);
  expect(geometry.dot).toEqual(dot);
  const base={x:(geometry.head[1].x+geometry.head[2].x)/2,y:(geometry.head[1].y+geometry.head[2].y)/2};
  expect(Math.hypot(end.x-base.x,end.y-base.y)).toBeCloseTo(9);
});

it('supports explicit start coordinates and a straight route', () => {
  const geometry=calloutGeometry({...callout,route:'straight'}, {x:7,y:8},labelBox(20,50,60,40));
  expect(geometry.points).toEqual([{x:7,y:8},{x:50,y:44}]);
});

it('stacks colliding notes downward deterministically from measured dimensions', () => {
  const notes=[{id:'a',x:50,y:20,width:80,height:20},{id:'b',x:50,y:20,width:60,height:30}];
  const obstacles=[labelBox(10,10,90,30)];
  const placed=placeCallouts(notes,obstacles);
  expect(placed.a.top).toBe(47);
  expect(placed.b.top).toBe(74);
  expect(placeCallouts(notes,obstacles)).toEqual(placed);
  expect(placed.a.x).toBe(50);
});

it('validates callout content, coordinates, duplicate IDs and named note references', () => {
  expect(calloutSchema.safeParse(callout).success).toBe(true);
  expect(calloutSchema.safeParse({...callout,from:{x:0,y:0}}).success).toBe(false);
  expect(calloutSchema.safeParse({...callout,text:'중복'}).success).toBe(false);
  const check=(actions:Action[])=>actionErrors({...scene,narration:[{id:'one',role:'say',text:'설명',cue:{actions}}]});
  expect(check([callout,{type:'tint',target:'item:c1',color:'accent'},{type:'underline',target:'item:c1'},
    {...callout,id:'c2',target:'item:c1'}])).toEqual([]);
  expect(check([callout,{...callout,id:'c1'}]).join()).toContain('중복');
  expect(check([{...callout,target:'item:missing'}]).join()).toContain('대상');
  expect(check([{...callout,position:{x:2,y:0}}]).join()).toContain('좌표');
  expect(check([{type:'tint',target:'axis:x',color:'mint'}]).join()).toContain('tint');
});

it('requires a board group head position and disallows follower positions and gaps', () => {
  expect(itemErrors(scene.stage)).toEqual([]);
  const items=itemsOf(scene.stage);
  expect(itemErrors({type:'board',items:items.map(item=>({...item,position:undefined}))}).join()).toContain('position');
  expect(itemErrors({type:'graph',items}).join()).toContain('board');
  expect(itemErrors({type:'board',items:[items[0],{...items[1],position:{x:.5,y:.5},gap:'1em'}]}).join()).toContain('첫 item');
});

it('renders independent tint tokens and a baseline flex group using intrinsic text widths', () => {
  const state=run([{type:'tint',target:'item:t1',color:'mint'},{type:'tint',target:'item:t2',color:'mark'}],1000);
  const html=renderToStaticMarkup(<BoardItems items={itemsOf(scene.stage)} state={state} params={{}} space={{sx:x=>x*1280,sy:y=>y*720}}/>);
  expect(html).toContain('data-item-group="expr"');
  expect(html).toContain('left:640px');
  expect(html).toContain('gap:0.6em');
  expect(html).toContain('color:var(--studio-tint-mint)');
  expect(html).toContain('color:var(--studio-tint-mark)');
  const css=readFileSync('components/studio/items.module.css','utf8');
  expect(css).toMatch(/display:flex; align-items:baseline; width:max-content; transform:translateX\(-50%\)/);
  for(const color of ['mint','accent','mark','hand'] as const)expect(annotationColor(color)).toBe('var(--studio-tint-'+color+')');
});

it('renders named callout as an item target with body math font and sequential animation', () => {
  const state=run([callout],400),boxes={'item:t1':labelBox(20,20,60,40)};
  const space={sx:(x:number)=>x*1000,sy:(y:number)=>y*700,x:[0,1] as [number,number],y:[0,1] as [number,number],target:(id:string)=>boxes[id as keyof typeof boxes]??null};
  const html=renderToStaticMarkup(<svg><CalloutLayer state={state} space={space} boxes={boxes}/></svg>);
  expect(html).toContain('data-stage-target="item:c1"');
  expect(html).toContain('r="4"');
  expect(html).toContain('stroke-dashoffset="0"');
  expect(html).toContain('var(--studio-tint-chalk)');
  const early=renderToStaticMarkup(<svg><CalloutLayer state={run([callout],40)} space={space} boxes={boxes}/></svg>);
  expect(early).toContain('stroke-dashoffset="1"');
  expect(early).toContain('opacity:0');
});

it('validates the new demonstration and preserves optional headline accent defaults', () => {
  expect(lessonSchema.safeParse(studioDemo).success).toBe(true);
  expect(scene.headline?.accent_bar).toBe(true);
  expect(studioDemo.scenes[0].headline?.accent_bar).toBeUndefined();
  const state=stageStateAt(scene,1200,[0,5000]);
  expect(state.tints?.['item:t1']).toBe('mint');
  expect(state.callouts?.[0].action.tex).toBe('4\\times x^3 \\;\\to\\; 4x^3');
});
