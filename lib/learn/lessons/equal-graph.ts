import {graphScale,type GraphViewport} from './graph';
export function equalGraph(camera:{x:[number,number];y:[number,number]},viewport:GraphViewport,aspect:'equal'|'free'='equal',numberLine=false){
 if(numberLine)return {x:camera.x,y:camera.y,...graphScale(camera.x,camera.y,viewport),unitX:(viewport.width-viewport.left-viewport.right)/(camera.x[1]-camera.x[0]),unitY:(viewport.height-viewport.top-viewport.bottom)/(camera.y[1]-camera.y[0])};
 const w=viewport.width-viewport.left-viewport.right,h=viewport.height-viewport.top-viewport.bottom,unit=Math.min(w/(camera.x[1]-camera.x[0]),h/(camera.y[1]-camera.y[0])),cx=(camera.x[0]+camera.x[1])/2,cy=(camera.y[0]+camera.y[1])/2;
 const x:[number,number]=aspect==='equal'?[cx-w/unit/2,cx+w/unit/2]:camera.x,y:[number,number]=aspect==='equal'?[cy-h/unit/2,cy+h/unit/2]:camera.y;
 return {x,y,...graphScale(x,y,viewport),unitX:w/(x[1]-x[0]),unitY:h/(y[1]-y[0])};
}
export function spacedTicks(range:[number,number],unit:number){let step=range[1]-range[0]<=1?0.5:1;while(step>(range[1]-range[0])/2&&step>Number.EPSILON)step/=2;while(step*unit<40){const power=10**Math.floor(Math.log10(step)),factor=Math.round(step/power);step=(factor===1?2:factor===2?5:10)*power;}const first=Math.ceil(range[0]/step)*step,count=Math.max(0,Math.floor((range[1]-first)/step)+1);return Array.from({length:Math.min(200,count)},(_,i)=>Number((first+i*step).toPrecision(12)));}
