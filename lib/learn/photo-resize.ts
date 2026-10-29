export function resizedPhotoSize(width:number,height:number) {
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid photo dimensions');
 const scale=Math.min(1,2000/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
/** Browser decoding applies EXIF before drawing; unsupported formats retain their original file. */
export async function resizeLearnPhoto(file:File):Promise<File> {
 let bitmap:ImageBitmap|undefined;
 try {
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  const size=resizedPhotoSize(bitmap.width,bitmap.height),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext('2d');if(!ctx)return file;
  ctx.drawImage(bitmap,0,0,size.width,size.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));
  return blob?new File([blob],file.name.replace(/\.[^.]*$/,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified}):file;
 }catch{return file;}finally{bitmap?.close();}
}
