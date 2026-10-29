export const LOCKED_VARIANT_MESSAGE = '이 문항은 지시문이 식과 연동돼 변형을 만들지 않습니다';

export function hasNumericInstruction(stem: string) {
  const regions=[...stem.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]*?)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)];
  if(!regions.length)return /[+−-]?\d+(?:\/\d+)?\s*(?:을|를|으로|로|씩|만큼)[가-힣\s]/.test(stem);
  let prose='',offset=0;
  for(const region of regions){
    prose+=stem.slice(offset,region.index);
    const math=region.slice(1).find(value=>value!==undefined)!.trim();
    if(regions.length>1&&/^[+−-]?\s*\d+(?:\.\d+)?$/.test(math))prose+=math;
    offset=region.index!+region[0].length;
  }
  prose+=stem.slice(offset);
  return /\d/.test(prose.replace(/^\s*(?:문제\s*)?\d+\s*[.)]\s*/,''));
}

export function hasFunctionNotation(stem:string){return /sqrt|root|abs|log|ln|exp|sin|cos|tan|pi|√|π/.test(stem);}
export function variantLockMessage(stem:string){return hasFunctionNotation(stem)?'함수·상수가 포함된 문항은 변형을 만들지 않아요':LOCKED_VARIANT_MESSAGE;}
