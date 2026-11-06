import type {Lesson,Scene} from './schema';
import {buildTimeline} from './timeline';

export function lessonClock(lesson:Pick<Lesson,'scenes'>,durations:Record<string,number|null|undefined>={}) {
  let total=0;
  const lengths=lesson.scenes.map(scene=>buildTimeline(scene,durations).totalMs);
  const sceneStarts=lengths.map(length=>{const start=total;total+=length;return start;});
  const clamp=(value:number,max:number)=>Math.max(0,Math.min(max,Number.isFinite(value)?value:0));
  return {total,sceneStarts,lengths,
    toScene(value:number){const t=clamp(value,total);let index=0;for(let i=1;i<sceneStarts.length;i++)if(t>=sceneStarts[i])index=i;return {index,local:t-sceneStarts[index]};},
    toLesson(index:number,local:number){const i=Math.max(0,Math.min(lengths.length-1,index));return sceneStarts[i]+clamp(local,lengths[i]);},
  };
}
export type LessonClock=ReturnType<typeof lessonClock>;
export function sceneNeedsContinue(scene:Scene){return scene.stage.type==='quiz'||scene.stage.type==='slider';}
export function sceneTitle(scene:Scene){return (scene.title||scene.headline?.title||scene.id).replace(/\n/g,' ');}
export type LessonResume={lessonId:string;time:number;title:string};
export function parseResume(raw:string|null):LessonResume|null {try{const value=JSON.parse(raw??'null');return value&&typeof value.lessonId==='string'&&typeof value.title==='string'&&Number.isFinite(value.time)&&value.time>=0?value:null;}catch{return null;}}
export function resumeKey(id:string){return 'studio.lessonTime:'+id;}
export function initialLessonTime(lesson:Lesson,clock:LessonClock,hash:string,raw:string|null){const id=decodeHash(hash),index=lesson.scenes.findIndex(scene=>scene.id===id);return index>=0?clock.sceneStarts[index]:Math.min(clock.total,parseResume(raw)?.time??0);}
function decodeHash(hash:string){try{return decodeURIComponent(hash.replace(/^#/,''));}catch{return '';}}
