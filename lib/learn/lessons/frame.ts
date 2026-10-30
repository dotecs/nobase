export function studioFrameScale(width:number,height:number){return Math.max(0,Math.min(1,width/1600,height/900));}

export function fitStageScale(width:number,height:number,contentWidth:number,contentHeight:number){return contentWidth>0&&contentHeight>0?Math.max(0,Math.min(1,width/contentWidth,height/contentHeight)):1;}
