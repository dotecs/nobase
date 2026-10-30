import {stripMarkers} from './markers';
import { parseMath, type Expr } from '../mathcheck/parse';
import type { Sentence } from './schema';
const letters:Record<string,string>={a:'에이',b:'비',c:'씨',d:'디',e:'이',f:'에프',g:'지',h:'에이치',i:'아이',j:'제이',k:'케이',l:'엘',m:'엠',n:'엔',o:'오',p:'피',q:'큐',r:'알',s:'에스',t:'티',u:'유',v:'브이',w:'더블유',x:'엑스',y:'와이',z:'제트'};
const digits=['영','일','이','삼','사','오','육','칠','팔','구'];
export function koreanNumber(raw:string):string {
  const [whole,decimal]=raw.split('.');const n=Number(whole);let spoken='';
  if(n===0)spoken='영';else if(n<10000&&n>=0){[1000,100,10,1].forEach((unit,i)=>{const digit=Math.floor(n/unit)%10;if(digit)spoken+=(digit===1&&unit>1?'':digits[digit])+['천','백','십',''][i];});}else spoken=whole.split('').map(c=>digits[Number(c)]??c).join(' ');
  return spoken+(decimal?' 점 '+decimal.split('').map(c=>digits[Number(c)]).join(' '):'');
}
function speak(expr:Expr):string {
  switch(expr.kind){
    case 'number':return koreanNumber(expr.raw??expr.value.toString());
    case 'variable':return letters[expr.name]??expr.name;
    case 'constant':return '파이';
    case 'neg':return '마이너스 '+speak(expr.value);
    case 'call':return (expr.fn==='sqrt'?'루트':expr.fn==='abs'?'절댓값':expr.fn)+' '+expr.args.map(speak).join(' ');
    case 'binary':{const a=speak(expr.left),b=speak(expr.right);return expr.op==='/'?`${b} 분의 ${a}`:expr.op==='^'?`${a} ${b==='이'?'제곱':b+' 제곱'}`:`${a} ${{'+':'플러스','-':'마이너스','*':''}[expr.op]} ${b}`;}
  }
}
export function spokenMath(source:string):string {
  try {const p=parseMath(source);return (speak(p.left)+(p.right?' '+({'=':'는','<':'보다 작다','<=':'작거나 같다','>':'보다 크다','>=':'크거나 같다'}[p.relation!])+' '+speak(p.right):'')).replace(/\s+/g,' ').replace('엑스 는','엑스는').trim();}
  catch {return source.replace(/\\(?:leq|le)\b/g,' 작거나 같다 ').replace(/\\sqrt\{([^{}]*)\}/g,' 루트 $1 ').replace(/\\pm/g,' 플러스 마이너스 ').replace(/[a-z]/gi,c=>letters[c.toLowerCase()]??c).replace(/\d+/g,koreanNumber).replace(/[{}\\]/g,' ').replace(/\s+/g,' ').trim();}
}
export const roleDirections={say:'',think:'[slower, thinking aloud]',write:'[clear, deliberate]'} as const;
export function rawTtsScript(sentence:Sentence){if(sentence.tts)return sentence.tts;return [roleDirections[sentence.role],sentence.text.replace(/\$\$?([\s\S]*?)\$\$?/g,(_,math:string)=>spokenMath(math))].filter(Boolean).join(' ');}

export function ttsScript(sentence:Sentence){return stripMarkers(rawTtsScript(sentence));}
