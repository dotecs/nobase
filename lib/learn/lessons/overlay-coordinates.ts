/** SVG xMidYMid meet, including any CSS scale on ancestors. One mapping for every DOM target. */
export function overlayCoordinates(rect:{left:number;top:number;width:number;height:number},viewBox:{x:number;y:number;width:number;height:number}) {
  const scale=Math.min(rect.width/viewBox.width,rect.height/viewBox.height)||1;
  const left=rect.left+(rect.width-viewBox.width*scale)/2,top=rect.top+(rect.height-viewBox.height*scale)/2;
  return {scale,toLocal:(x:number,y:number)=>({x:(x-left)/scale+viewBox.x,y:(y-top)/scale+viewBox.y}),
    toClient:(x:number,y:number)=>({x:left+(x-viewBox.x)*scale,y:top+(y-viewBox.y)*scale})};
}
