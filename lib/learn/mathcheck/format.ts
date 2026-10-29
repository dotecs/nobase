import { parseMath,UnsupportedError } from './parse';
import { toLatex } from './latex';
export type MathDisplay={status:'success';latex:string}|{status:'unsupported';raw:string;symbol:string}|{status:'incomplete';raw:string};
export function inspectMath(text:string):MathDisplay {
 try{return {status:'success',latex:toLatex(parseMath(text))};}
 catch(error){if(error instanceof UnsupportedError&&error.message.startsWith('Unsupported notation: '))return {status:'unsupported',raw:text,symbol:error.message.slice('Unsupported notation: '.length)};return {status:'incomplete',raw:text};}
}
export function formatMath(text:string):{latex:string}|{raw:string} {
 const result=inspectMath(text);return result.status==='success'?{latex:result.latex}:{raw:text};
}
