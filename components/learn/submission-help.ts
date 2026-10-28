import type { AnswerType } from '@/lib/learn/types';
export function submissionHelp(type:AnswerType,answer:string|string[],photoRequired:boolean,photo:string|null) {
  if(photoRequired&&!photo)return '풀이 사진을 올리면 제출할 수 있어요';
  if(type!=='photo'&&(Array.isArray(answer)?answer.length===0:answer.trim()===''))return '답을 입력하면 제출할 수 있어요';
  return '';
}
