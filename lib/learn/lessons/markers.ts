export function stripMarkers(text:string){return text.replace(/⟨[a-z0-9]+⟩/g,'');}
/** Positions count spoken, non-whitespace code points; direction tags are not voiced. */
export function speechMarkers(source:string){const clean=source.replace(/\[[^\]]*\]/g,'').replace(/\*\*/g,''),markers:{name:string;index:number}[]=[];let text='';for(const part of clean.split(/(⟨[a-z0-9]+⟩)/)){const match=part.match(/^⟨([a-z0-9]+)⟩$/);if(match)markers.push({name:match[1],index:Array.from(text).filter(c=>! /\s/.test(c)).length});else text+=part;}return {text,markers};}
