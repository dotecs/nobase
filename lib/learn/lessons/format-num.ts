import {Rational} from '../mathcheck/rational';
const close=(a:number,b:number)=>Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b));
function fraction(value:number,maxDenominator:number):[number,number]|null{
 let x=value,p0=0,p1=1,q0=1,q1=0;
 for(let i=0;i<64;i++){const a=Math.floor(x),p=a*p1+p0,q=a*q1+q0;if(q>maxDenominator||!Number.isSafeInteger(p)||!Number.isSafeInteger(q))break;if(close(value,p/q))return [p,q];const r=x-a;if(!r)break;[p0,p1,q0,q1]=[p1,p,q1,q];x=1/r;}return null;
}
export function rationalTex(r:Rational){const sign=r.n<BigInt(0)?'-':'',n=r.n<BigInt(0)?-r.n:r.n;return r.d===BigInt(1)?(sign?'−':'')+n:sign+`\\tfrac{${n}}{${r.d}}`;}
export function decimalRational(value:number){if(!Number.isFinite(value))throw new Error('유한한 수가 필요합니다.');const [mantissa,exponent='0']=String(value).split('e'),r=Rational.parse(mantissa),e=Number(exponent);return e>=0?new Rational(r.n*BigInt(10)**BigInt(e),r.d):new Rational(r.n,r.d*BigInt(10)**BigInt(-e));}
function ratio(p:number,q:number,symbol:string,mode:'tex'|'text'){const n=(p===1&&symbol?'':String(p))+symbol;return q===1?n:mode==='tex'?`\\tfrac{${n}}{${q}}`:`${n}/${q}`;}
function recognized(value:number,mode:'tex'|'text'):string|null{
 if(!Number.isFinite(value))return null;const negative=value<0,v=Math.abs(value),sign=negative?(mode==='tex'?'-':'−'):'';
 if(close(v,Math.round(v)))return (negative&&Math.round(v)!==0?'−':'')+decimalRational(Math.round(v)).toString();
 const rational=fraction(v,64);if(rational)return sign+ratio(...rational,'',mode);
 for(const [constant,symbol,max] of [[Math.PI,mode==='tex'?'\\pi':'π',12],[Math.E,'e',4]] as const){const r=fraction(v/constant,max);if(r&&r[0]!==0&&close(v,r[0]/r[1]*constant))return sign+ratio(...r,symbol,mode);}
 const square=fraction(v*v,64);
 if(square){const [p,q]=square,n=p*q;if(Number.isSafeInteger(n)&&n>0){let rest=n,outside=1;for(let d=2;d*d<=rest;d++){while(rest%(d*d)===0){outside*=d;rest/=d*d;}}if(rest>1){const r=new Rational(outside,q),root=mode==='tex'?`\\sqrt{${rest}}`:`√${rest}`,numerator=(r.n===BigInt(1)?'':String(r.n))+root;return sign+(r.d===BigInt(1)?numerator:mode==='tex'?`\\tfrac{${numerator}}{${r.d}}`:`${numerator}/${r.d}`);}}}return null;
}
/** Unrecognized finite decimals are reduced exactly, per the 2026-11-01 clarification. */
export function formatExact(value:number,mode:'tex'|'text'):string{const result=recognized(value,mode);if(result!==null)return result;const r=decimalRational(value);return mode==='tex'?rationalTex(r):r.toString().replace('-','−');}
export function isExact(value:number):boolean{return Number.isFinite(value);}
export function formatNum(value:number){return formatExact(value,'text');}
export function formulaValues(formula:string,params:Record<string,number>){return formula.replace(/([+\-−])(\s*)\{\{([a-zA-Z]+)\}\}/g,(_,sign:string,space:string,name:string)=>{const v=params[name];if(!Number.isFinite(v))return sign+space+'{{'+name+'}}';return ((v<0)!==(sign!=='+')?'-':'+')+space+formatExact(Math.abs(v),'tex');}).replace(/\{\{([a-zA-Z]+)\}\}/g,(_,name:string)=>formatExact(params[name],'tex'));}
