import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const hooks=vi.hoisted(()=>({cursor:0,slots:[] as any[],effects:new Map<number,{deps:unknown[];cleanup?:()=>void}>(),pending:[] as (()=>void)[]}));
vi.mock('react',()=>({
  useState:(initial:unknown)=>{const i=hooks.cursor++;if(!(i in hooks.slots))hooks.slots[i]=initial;return [hooks.slots[i],(v:any)=>{hooks.slots[i]=typeof v==='function'?v(hooks.slots[i]):v;}];},
  useRef:(initial:unknown)=>{const i=hooks.cursor++;return hooks.slots[i]??(hooks.slots[i]={current:initial});},
  useCallback:(fn:unknown,deps:unknown[])=>{const i=hooks.cursor++,old=hooks.slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))hooks.slots[i]={fn,deps};return hooks.slots[i].fn;},
  useEffect:(fn:()=>void|(()=>void),deps:unknown[])=>{const i=hooks.cursor++,old=hooks.effects.get(i);if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))hooks.pending.push(()=>{old?.cleanup?.();hooks.effects.set(i,{deps,cleanup:fn()??undefined});});},
}));
import {useLessonNavigation} from '@/components/studio/useLessonNavigation';
import {lessonClock,resumeKey} from './lesson-clock';
import {studioDemo} from './studio-demo';
const clock=lessonClock(studioDemo);
function Harness(lesson=studioDemo){hooks.cursor=0;const result=useLessonNavigation(lesson,clock);hooks.pending.splice(0).forEach(fn=>fn());return result;}
const store=new Map<string,string>(),listeners=new Map<string,()=>void>();
beforeEach(()=>{vi.useFakeTimers();hooks.cursor=0;hooks.slots=[];hooks.effects.clear();hooks.pending=[];store.clear();listeners.clear();vi.stubGlobal('localStorage',{getItem:(key:string)=>store.get(key)??null,setItem:(k:string,v:string)=>store.set(k,v)});vi.stubGlobal('location',{hash:'',href:'http://localhost/learn/lesson/demo'});vi.stubGlobal('history',{replaceState:vi.fn()});vi.stubGlobal('window',{addEventListener:(name:string,fn:()=>void)=>listeners.set(name,fn),removeEventListener:(name:string)=>listeners.delete(name)});});
afterEach(()=>{hooks.effects.forEach(e=>e.cleanup?.());vi.useRealTimers();vi.unstubAllGlobals();});
it('restores a saved lesson position on first mount and preserves it after fresh RSC props',()=>{store.set(resumeKey(studioDemo.id),JSON.stringify({lessonId:studioDemo.id,title:'강',time:clock.sceneStarts[1]+123}));Harness();const state=Harness(structuredClone(studioDemo));expect(state.cursor.index).toBe(1);expect(state.cursor.local).toBe(123);});
it('gives hash entry its scene start and registers the URL with the router',()=>{location.hash='#'+studioDemo.scenes[2].id;Harness();expect(Harness().cursor.index).toBe(2);expect(Harness().cursor.local).toBe(0);expect(history.replaceState).toHaveBeenCalledWith(null,'',location.href);});
it('fades out then replaces the scene at its requested local time and fades in',()=>{Harness();Harness().navigate(clock.sceneStarts[1]+456,true);expect(Harness().phase).toBe('out');expect(Harness().cursor.index).toBe(0);vi.advanceTimersByTime(120);expect(Harness().phase).toBe('in');expect(Harness().cursor).toMatchObject({index:1,local:456,autoplay:true});vi.advanceTimersByTime(120);expect(Harness().phase).toBeNull();});
it('cancels an older cross-scene seek and saves the newest paused position',()=>{Harness();Harness().navigate(clock.sceneStarts[1],true);Harness().navigate(123,false);vi.advanceTimersByTime(300);expect(Harness().cursor).toMatchObject({index:0,local:123,autoplay:false});expect(JSON.parse(store.get(resumeKey(studioDemo.id))!).time).toBe(123);});
it('flushes the exact playback position on pagehide',()=>{Harness();Harness().progress(1,789);listeners.get('pagehide')!();expect(JSON.parse(store.get(resumeKey(studioDemo.id))!).time).toBe(clock.sceneStarts[1]+789);});
it('updates the seek range immediately and ignores the old pause snapshot until the target player acknowledges it',()=>{
  Harness();Harness().progress(0,83.3);const target=clock.sceneStarts[1]+500;Harness().navigate(target,false);
  expect(Harness().time).toBe(target);Harness().progress(0,83.3);expect(Harness().time).toBe(target);
  vi.advanceTimersByTime(240);Harness().progress(1,500);Harness().progress(1,580);expect(Harness().time).toBe(clock.sceneStarts[1]+580);
});
it('pauses a seek to T instead of replaying the last scene and saves pending seeks on exit',()=>{Harness();Harness().navigate(clock.total,true);listeners.get('pagehide')!();expect(JSON.parse(store.get(resumeKey(studioDemo.id))!).time).toBe(clock.total);vi.advanceTimersByTime(240);expect(Harness().cursor.autoplay).toBe(false);});
