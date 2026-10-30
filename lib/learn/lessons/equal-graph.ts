import {graphScale,type GraphViewport} from './graph';
export function equalGraph(camera:{x:[number,number];y:[number,number]},viewport:GraphViewport,aspect:'equal'|'free'='equal'){
 const x=camera.x,unit=(viewport.width-viewport.left-viewport.right)/(x[1]-x[0]),cy=(camera.y[0]+camera.y[1])/2,span=(viewport.height-viewport.top-viewport.bottom)/unit;
 const y:[number,number]=aspect==='equal'?[cy-span/2,cy+span/2]:camera.y;
 return {x,y,...graphScale(x,y,viewport),unitX:unit,unitY:(viewport.height-viewport.top-viewport.bottom)/(y[1]-y[0])};
}
export function spacedTicks(range:[number,number],unit:number){let step=1;while(step*unit<36){const power=10**Math.floor(Math.log10(step)),factor=Math.round(step/power);step=(factor===1?2:factor===2?5:10)*power;}const first=Math.ceil(range[0]/step)*step,count=Math.max(0,Math.floor((range[1]-first)/step)+1);return Array.from({length:Math.min(200,count)},(_,i)=>Number((first+i*step).toPrecision(12)));}
