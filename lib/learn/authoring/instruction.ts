export const INSTRUCTION_REQUIRED='지시문이 없는 문항은 승인할 수 없어요. 지문에 "다음 식을 전개하시오." 같은 문장을 넣어 주세요.';
export function hasInstruction(stem_md:string) {
 const outside=stem_md.replace(/\$\$[\s\S]*?\$\$|\$[^$]*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g,'');
 return (outside.match(/[가-힣]/g)?.length??0)>=2;
}
export function requireInstruction(stem_md:string){if(!hasInstruction(stem_md))throw new Error(INSTRUCTION_REQUIRED);}
