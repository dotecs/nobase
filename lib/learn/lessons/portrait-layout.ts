import type { BoardItem } from './items';
import type { TargetBox } from './chalk';
import { labelBox, overlaps } from './point-labels';
import { nearBox, type NearPosition } from './position';
export type PortraitNote={id:string;target?:string;side?:NearPosition['side'];gap:number;width:number;height:number};
export function wrapTerms(widths:number[],width:number,gap=12) {
  const rows:number[][]=[];let used=0;
  widths.forEach((size,i)=>{if(!rows.length||used+gap+size>width){rows.push([i]);used=size;}else{rows.at(-1)!.push(i);used+=gap+size;}});
  return rows;
}
export function portraitItems(items:BoardItem[]) {
  return items.map((item,i)=>({item,i})).sort((a,b)=>Number(!a.item.group)-Number(!b.item.group)||(a.item.order??a.i)-(b.item.order??b.i)).map(({item})=>item);
}
/** Rebuild from measured sizes and glyph offsets, never from a previous placement. */
export function portraitLayout(width:number,baseHeight:number,items:BoardItem[],measured:Record<string,TargetBox>,notes:PortraitNote[]) {
  const pad=12,available=Math.max(1,width-pad*2),boxes:Record<string,TargetBox>={},noteBoxes:Record<string,TargetBox>={};
  let cursor=baseHeight?baseHeight+16:12;
  const placed=new Set<string>(),ordered=portraitItems(items),groups=new Set<string>();
  const size=(item:BoardItem)=>{const box=measured['item:'+item.id];return {width:Math.min(available,item.kind==='note'?available:box?box.right-box.left:100),height:box?box.bottom-box.top:44};};
  const targetBox=(target:string):TargetBox|undefined=>{
    const parent=target.split('/')[0],old=measured[parent],next=boxes[parent],part=measured[target];
    if(next&&target===parent)return next;
    if(next&&old&&part)return labelBox(next.left+part.left-old.left,next.top+part.top-old.top,part.right-part.left,part.bottom-part.top);
    return noteBoxes[target]??part;
  };
  const put=(note:PortraitNote,obstacles:TargetBox[],fallback=cursor)=>{
    const target=note.target?targetBox(note.target):undefined,w=Math.min(available,note.width),h=note.height;
    let box=target?nearBox(target,w,h,note.side,note.gap):labelBox(pad,fallback,available,h);
    const side=note.side??'below';
    if(box.left<pad||box.right>width-pad){if(side==='left'||side==='right')box=nearBox(target!,w,h,'below',note.gap);box=labelBox(Math.max(pad,Math.min(width-pad-w,box.left)),box.top,w,h);}
    box=labelBox(box.left,Math.max(12,box.top),w,h);
    for(let i=0;i<=obstacles.length;i++){
      const conflicts=obstacles.filter(other=>overlaps(box,other,6));if(!conflicts.length)break;
      const above=Math.min(...conflicts.map(b=>b.top))-h-12;
      box=labelBox(box.left,side==='above'&&above>=12?above:Math.max(...conflicts.map(b=>b.bottom))+12,w,h);
    }
    noteBoxes[note.id]=box;placed.add(note.id);return box;
  };
  for(const item of ordered){
    if(item.group&&groups.has(item.group))continue;
    if(item.group)groups.add(item.group);
    const members=item.group?ordered.filter(other=>other.group===item.group):[item];
    for(const row of wrapTerms(members.map(item=>size(item).width),available)){
      const terms=row.map(i=>members[i]),ids=new Set(terms.map(item=>'item:'+item.id));
      const attached=notes.filter(note=>note.target&&ids.has(note.target.split('/')[0]));
      const top=attached.filter(note=>note.side==='above').reduce((sum,n)=>sum+n.height+n.gap+6,0);
      cursor+=top;
      const total=terms.reduce((sum,item)=>sum+size(item).width,0)+12*(terms.length-1);let x=(width-total)/2;
      let rowEnd=cursor;
      for(const term of terms){const s=size(term);boxes['item:'+term.id]=labelBox(x,cursor,s.width,s.height);x+=s.width+12;rowEnd=Math.max(rowEnd,cursor+s.height);}
      for(const note of attached){const box=put(note,[...Object.values(boxes),...Object.values(noteBoxes)]);rowEnd=Math.max(rowEnd,box.bottom);}
      cursor=rowEnd+(item.group?12:20);
    }
  }
  for(const note of notes.filter(note=>!placed.has(note.id))){
    const obstacles=[...Object.values(boxes),...Object.values(noteBoxes),...(baseHeight?[labelBox(0,0,width,baseHeight)]:[])];
    const box=put(note,obstacles);cursor=Math.max(cursor,box.bottom+16);
  }
  return {items:boxes,notes:noteBoxes,height:Math.max(baseHeight,cursor)+12};
}
