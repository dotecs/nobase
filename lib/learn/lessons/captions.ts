import type {Sentence} from './schema';
import type {Alignment} from './alignment';
import {compactText} from './anchors';
import {spokenMath} from './tts-script';
export type CaptionWord={text:string;math?:string;emphasis:boolean;space:boolean;start:number;end:number;chunk:number};
export function captionWords(sentence:Sentence,alignment:Alignment|null,duration:number):CaptionWord[]{
 const words:CaptionWord[]=[];let emphasis=false,space=false;
 for(const part of sentence.text.split(/(\*\*)/)){if(part==='**'){emphasis=!emphasis;continue;}for(const match of part.matchAll(/\$\$[\s\S]*?\$\$|\$[^$]+\$|\s+|[^\s$]+/g)){const text=match[0];if(/^\s+$/.test(text)){space=true;continue;}words.push({text,math:text.startsWith('$')?text.replace(/^\$\$?|\$\$?$/g,''):undefined,emphasis,space,start:0,end:0,chunk:0});space=false;}}
 const spoken=words.map(w=>compactText(w.math?spokenMath(w.math):w.text.replace(/[.,!?…]/g,'')).text),weights=spoken.map(s=>Math.max(1,Array.from(s).length)),total=weights.reduce((a,b)=>a+b,0),aligned=alignment?compactText(alignment.chars):null;
 let consumed=0,cursor=0,chunk=0,chunkLength=0;
 words.forEach((w,i)=>{const length=Array.from(w.math??w.text).length+(w.space?1:0);if(chunkLength+length>32&&chunkLength>0){chunk++;chunkLength=0;}w.chunk=chunk;chunkLength+=length;
  w.start=consumed/total*duration;w.end=(consumed+weights[i])/total*duration;
  if(aligned&&alignment&&spoken[i]){const index=aligned.text.indexOf(spoken[i],cursor);if(index>=0){const first=Array.from(aligned.text.slice(0,index)).length,last=first+Array.from(spoken[i]).length-1;w.start=alignment.start[aligned.indices[first]]??w.start;w.end=alignment.end[aligned.indices[last]]??w.end;cursor=index+spoken[i].length;}}
  consumed+=weights[i];
 });return words;
}
export function captionChunk(words:CaptionWord[],time:number){const active=words.find(w=>w.end>time)??words.at(-1);return words.filter(w=>w.chunk===active?.chunk);}
