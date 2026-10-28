import type { AnswerType } from '@/lib/learn/types';
export function submissionHelp(type:AnswerType,answer:string|string[],photoRequired:boolean,photo:string|null) {
  if(photoRequired&&!photo)return '풀이 사진을 올리면 제출할 수 있어요';
  const empty=Array.isArray(answer)?answer.length===0:answer.trim()===''||(type==='number'&&/^[a-z]?\s*(?:<=|>=|<|>|=)\s*$/.test(answer.trim()));
  if(type!=='photo'&&empty)return '답을 입력하면 제출할 수 있어요';
  return '';
}
