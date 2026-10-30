import type { Scene } from './schema';
import { captionDuration } from './events';
export const PLAYBACK_RATES=[.8,1,1.25,1.5] as const;
export function buildTimeline(scene:Scene,durations:Record<string,number|null|undefined>={}){
 let cursor=0;const entries=scene.narration.map(sentence=>{const duration=durations[sentence.id],durationMs=duration&&Number.isFinite(duration)&&duration>0?duration:captionDuration(sentence.text,1),startMs=cursor;cursor+=durationMs;return {sentence,startMs,endMs:cursor,durationMs};});
 return {entries,starts:entries.map(e=>e.startMs),totalMs:cursor};
}
export type Timeline=ReturnType<typeof buildTimeline>;
export function timelinePosition(timeline:Timeline,time:number){const clamped=Math.max(0,Math.min(timeline.totalMs,time));const index=Math.max(0,timeline.entries.findIndex(e=>clamped<e.endMs));const actual=clamped===timeline.totalMs?timeline.entries.length-1:index;return {index:actual,localMs:clamped-timeline.entries[actual].startMs,ended:clamped>=timeline.totalMs};}
export function formatTimelineTime(ms:number){const seconds=Math.floor(Math.max(0,ms)/1000);return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
export function waveformPeaks(channels:Float32Array[],count=64){const length=channels[0]?.length??0;if(!length)return Array(count).fill(.25) as number[];const peaks=Array.from({length:count},(_,i)=>{let peak=0;for(const data of channels)for(let j=Math.floor(i*length/count);j<Math.floor((i+1)*length/count);j++)peak=Math.max(peak,Math.abs(data[j]??0));return peak;});const max=Math.max(...peaks);return max?peaks.map(p=>Math.max(.08,p/max)):Array(count).fill(.25) as number[];}
