import type { PadSnapshot } from './pad-draft';
/** Completion panels keep polling after the draft-input synchronizer has stopped. */
export function pollSessionPhotos(options:{count:number;read:()=>Promise<Pick<PadSnapshot,'session_photo_count'>|{error:string}>;onChange:()=>void;onError:(message:string)=>void}) {
  let alive=true,busy=false,count=options.count;
  const interval=setInterval(async()=>{
    if(!alive||busy)return;busy=true;
    try {const snapshot=await options.read();if(!alive)return;if('error' in snapshot){options.onError(snapshot.error);return;}
      options.onError('');if(snapshot.session_photo_count!==count){count=snapshot.session_photo_count;options.onChange();}
    }catch{if(alive)options.onError('사진을 확인하지 못했습니다. 잠시 후 다시 연결합니다.');}finally{busy=false;}
  },2000);
  return ()=>{alive=false;clearInterval(interval);};
}
