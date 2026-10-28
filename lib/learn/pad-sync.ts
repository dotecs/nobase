import type { PadDraft,PadSnapshot } from './pad-draft';
type Result<T>=T|{error:string};
export function createPadSync(options:{
  source:'pad'|'screen';planIndex:number;
  read:()=>Promise<Result<PadSnapshot>>;save:(draft:PadDraft)=>Promise<Result<{updated_at:string}>>;
  onDraft:(draft:PadDraft)=>void;onProgress:()=>void;onStatus:(time:string|null)=>void;onError:(message:string)=>void;
}) {
  let alive=true,revision=0,savedRevision=0,lastSeen=0,latest:PadDraft|null=null;
  let debounce:ReturnType<typeof setTimeout>|undefined,polling=false,queue=Promise.resolve();
  const enqueue=()=>{
    clearTimeout(debounce);debounce=undefined;if(!latest)return;
    const draft=latest,version=revision;
    queue=queue.then(async()=>{
      if(!alive)return;
      try{const result=await options.save(draft);if(!alive)return;if('error' in result){options.onError(result.error);return;}
        savedRevision=Math.max(savedRevision,version);lastSeen=Math.max(lastSeen,Date.parse(result.updated_at));
      }catch{if(alive)options.onError('입력을 저장하지 못했습니다. 다시 시도해 주세요.');}
    });
  };
  const poll=async()=>{
    if(!alive||polling)return;polling=true;const before=revision;
    try{
      const result=await options.read();if(!alive)return;
      if('error' in result){options.onError(result.error);return;}
      if(result.ended||result.plan_index!==options.planIndex){stop();options.onProgress();return;}
      if(result.draft?.source==='pad')options.onStatus(result.updated_at);
      if(result.draft&&result.updated_at&&Date.parse(result.updated_at)>lastSeen&&revision===savedRevision&&revision===before){
        lastSeen=Date.parse(result.updated_at);if(result.draft.source!==options.source)options.onDraft(result.draft);
      }
    }catch{if(alive)options.onError('폰 연결을 확인해 주세요. 잠시 후 다시 연결합니다.');}
    finally{polling=false;}
  };
  const interval=setInterval(()=>void poll(),2000);
  function stop(){alive=false;clearInterval(interval);clearTimeout(debounce);}
  return {
    edit(draft:PadDraft){if(!alive)return;revision++;latest=structuredClone(draft);clearTimeout(debounce);debounce=setTimeout(enqueue,300);},
    async flush(){if(debounce)enqueue();await queue;},
    stop,
  };
}
export function padConnectionLabel(updatedAt:string|null,now:number) {
  const seconds=updatedAt?Math.max(0,Math.floor((now-Date.parse(updatedAt))/1000)):Infinity;
  return seconds<60?`폰에서 입력 중 · ${seconds}초 전`:'폰 연결 대기';
}
