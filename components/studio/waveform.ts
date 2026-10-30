import { waveformPeaks } from '@/lib/learn/lessons/timeline';
export const FLAT_WAVEFORM=Array(64).fill(.25) as number[];
const cache=new Map<string,Promise<number[]>>();
export function loadWaveform(url:string){
 if(cache.has(url))return cache.get(url)!;
 const load=async()=>{let context:AudioContext|undefined;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error('Audio unavailable');const bytes=await response.arrayBuffer();const Context=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;context=new Context();const decoded=await context.decodeAudioData(bytes);return waveformPeaks(Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i)));}catch{return FLAT_WAVEFORM;}finally{clearTimeout(timer);if(context)await context.close().catch(()=>{});}};
 if(cache.size>=32)cache.delete(cache.keys().next().value!);const value=load();cache.set(url,value);return value;
}
