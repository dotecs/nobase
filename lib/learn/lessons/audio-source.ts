type SourceChange={currentSentence?:string;nextSentence:string;currentUrl?:string;nextUrl?:string;playing:boolean;failed:boolean};

/** Keep the loaded stream while its sentence plays; refreshed signatures wait for pause/revisit. */
export function shouldReplaceAudioSource(change:SourceChange):boolean{
 const {currentSentence,nextSentence,currentUrl,nextUrl,playing,failed}=change;
 if(currentSentence!==nextSentence)return true;
 if((currentUrl??'')===(nextUrl??''))return false;
 if(playing&&!failed&&currentUrl&&nextUrl){
  try{
   const before=new URL(currentUrl,'https://audio.invalid'),after=new URL(nextUrl,'https://audio.invalid');
   if(before.origin===after.origin&&before.pathname===after.pathname&&before.hash===after.hash)return false;
  }catch{ /* Invalid or missing sources follow the ordinary replacement path. */ }
 }
 return true;
}
