import type {Sentence} from './schema';
import type {Alignment} from './alignment';
import {speechMarkers} from './markers';
import {rawTtsScript} from './tts-script';
export type At=number|`@${string}`;
export function spokenText(sentence:Sentence){return speechMarkers(rawTtsScript(sentence)).text;}
export function actionAnchor(action:{at?:unknown;at_ms?:number}):At{return typeof action.at==='number'||typeof action.at==='string'?action.at as At:action.at_ms??0;}
export function compactText(text:string){const chars=Array.from(text);return {text:chars.filter(c=>! /\s/.test(c)).join(''),indices:chars.flatMap((c,i)=>/\s/.test(c)?[]:[i])};}
export function anchorParts(at:At){if(typeof at==='number')return null;const match=at.match(/^@(.+?)(?:#([1-9]\d*))?([+-]\d+)?$/);return match?{word:match[1],occurrence:Number(match[2]??1),offset:Number(match[3]??0)}:null;}
function occurrenceAt(haystack:string,needle:string,n:number){let index=-1;for(let i=0;i<n;i++){index=haystack.indexOf(needle,index+1);if(index<0)return -1;}return Array.from(haystack.slice(0,index)).length;}
/** Pure: diagnostics are returned to the authoring validator instead of logging during playback. */
export function resolveAnchor(at:At,sentence:Sentence,alignment:Alignment|null,duration:number):{ms:number;warning?:string;source:'numeric'|'alignment'|'linear'|'caption'}{
 const length=alignment?.end.at(-1)??duration,clamp=(n:number)=>Math.max(0,n);
 if(typeof at==='number')return {ms:Math.max(0,at),source:'numeric'};
 const parts=anchorParts(at);if(!parts)return {ms:0,source:'linear',warning:'잘못된 앵커: '+at};
 const {word,occurrence,offset}=parts;
 if(word==='start'||word==='end')return {ms:clamp((word==='end'?length:0)+offset),source:alignment?'alignment':'linear'};
 const marker=speechMarkers(rawTtsScript(sentence)).markers.filter(m=>m.name===word)[occurrence-1];
 if(marker){const speech=compactText(spokenText(sentence)),aligned=alignment?compactText(alignment.chars):null,index=aligned?.indices[marker.index],ms=alignment?(index===undefined?length:alignment.start[index]):marker.index/Math.max(1,speech.indices.length)*duration;return {ms:clamp(ms+offset),source:alignment?'alignment':'linear'};}
 const speech=compactText(spokenText(sentence)),needle=compactText(word).text;
 const position=occurrenceAt(speech.text,needle,occurrence);
 if(position>=0){if(alignment){const aligned=compactText(alignment.chars),match=occurrenceAt(aligned.text,needle,occurrence),index=match>=0?aligned.indices[match]:aligned.indices[Math.min(aligned.indices.length-1,Math.floor(position/Math.max(1,speech.indices.length)*aligned.indices.length))];return {ms:clamp((alignment.start[index]??0)+offset),source:'alignment'};}return {ms:clamp(position/Math.max(1,speech.indices.length)*duration+offset),source:'linear'};}
 const caption=compactText(sentence.text.replace(/\*\*/g,'')),fallback=occurrenceAt(caption.text,needle,occurrence);
 if(fallback>=0)return {ms:clamp(fallback/Math.max(1,caption.indices.length)*length+offset),source:'caption'};
 return {ms:0,source:'linear',warning:'대본에서 앵커를 찾지 못했습니다: '+at};
}
export function resolveAt(at:At,sentence:Sentence,alignment:Alignment|null,fallbackDurationMs:number){return resolveAnchor(at,sentence,alignment,fallbackDurationMs).ms;}
