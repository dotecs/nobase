import { Rational } from './rational';
export class UnsupportedError extends Error {}
export const FUNCTIONS = ['sqrt','root','abs','log','ln','exp','sin','cos','tan'] as const;
export type FunctionName = typeof FUNCTIONS[number];
export type Expr = {kind:'number';value:Rational;raw?:string}|{kind:'variable';name:string}|{kind:'constant';name:'pi'}|{kind:'neg';value:Expr}|{kind:'binary';op:'+'|'-'|'*'|'/'|'^';left:Expr;right:Expr}|{kind:'call';fn:FunctionName;args:Expr[]};
export type Relation = '='|'<'|'<='|'>'|'>=';
export type Parsed = {left:Expr;relation?:Relation;right?:Expr};
const unsupported=(symbol:string):never=>{throw new UnsupportedError(`Unsupported notation: ${symbol}`);};
/** Expand only known notation, preserving grouping and numeric lexemes. */
export function normalizeMath(input:string):string {
  if(input.length>4000)throw new UnsupportedError('Expression too long');
  const bad=input.match(/∫|∑|Σ|lim|→/);if(bad)unsupported(bad[0]);
  const text=input.replace(/([+-]?\d+\s*\/\s*[+-]?\d+)\s*(?:÷|\\div)\s*([+-]?\d+\s*\/\s*[+-]?\d+)/g,'($1)/($2)').trim().replace(/^\$\$?([\s\S]*?)\$\$?$/,'$1').replace(/\\(?:left|right)/g,'').replace(/\\(?:dfrac|tfrac)/g,'\\frac')
    .replace(/\^\s*\{\\circ\}|\^?\\circ/g,'°').replace(/\\(?:times|cdot)/g,'*').replace(/\\div/g,'/').replace(/\\(?:leq|le)(?![a-z])/g,'<=').replace(/\\(?:geq|ge)(?![a-z])/g,'>=')
    .replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/[−–]/g,'-').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/²/g,'^2').replace(/³/g,'^3').replace(/√/g,'sqrt').replace(/π/g,'pi');
  // Keep the established plain-fraction division convention.

  let pos=0,depth=0;
  const space=()=>{while(/\s/.test(text[pos]??'')&&pos<text.length)pos++;};
  function group(open:string,close:string):string {space();if(text[pos++]!==open)throw new Error('Expected group');if(++depth>40)throw new UnsupportedError('Too deeply nested');const value=scan(close);if(text[pos++]!==close)throw new Error('Missing group');depth--;return value;}
  function argument():string {space();if(text[pos]==='{')return group('{','}');if(text[pos]==='(')return '('+group('(',')')+')';if(text[pos]==='\\')return command();const match=text.slice(pos).match(/^(?:\d+(?:\.\d+)?|pi|[a-z])/);if(!match)throw new Error('Missing argument');pos+=match[0].length;return match[0];}
  function command():string {
    pos++;const match=text.slice(pos).match(/^[a-zA-Z]+/);if(!match)unsupported('\\'+(text[pos]??''));const name=match![0];pos+=name.length;
    if(name==='frac')return '(('+group('{','}')+')/('+group('{','}')+'))';
    if(name==='sqrt'){space();const n=text[pos]==='['?group('[',']'):null;const arg=argument();return n===null?`sqrt(${arg})`:`root(${n},${arg})`;}
    if(name==='pi')return 'pi';
    if(name==='log'){space();if(text[pos]==='_'){pos++;const base=argument(),arg=argument();return `log(${base},${arg})`;}return 'log ';}
    if((FUNCTIONS as readonly string[]).includes(name))return name+' ';
    return unsupported('\\'+name);
  }
  function scan(end?:string):string {let out='';while(pos<text.length&&text[pos]!==end){if(text[pos]==='\\')out+=command();else if(text[pos]==='{')out+='('+group('{','}')+')';else out+=text[pos++];}return out;}
  return scan();
}
export function parseMath(input:string):Parsed {
  const text=normalizeMath(input),tokens:string[]=[];let offset=0;
  while(offset<text.length){if(/\s/.test(text[offset])){offset++;continue;}const m=text.slice(offset).match(/^(?:sqrt|root|abs|log|ln|exp|sin|cos|tan|pi|\d+(?:\.\d+)?|[a-z]|<=|>=|[+*/^()=<>|°,\-])/);if(!m)unsupported(text[offset]);tokens.push(m![0]);offset+=m![0].length;}
  if(tokens.length>600)throw new UnsupportedError('Too many tokens');
  let pos=0,depth=0,inAbs=false;
  const peek=()=>tokens[pos];
  const binary=(op:'+'|'-'|'*'|'/'|'^',left:Expr,right:Expr):Expr=>({kind:'binary',op,left,right});
  const num=(raw:string):Expr=>({kind:'number',value:Rational.parse(raw),raw});
  function nested<T>(fn:()=>T):T {if(++depth>40)throw new UnsupportedError('Too deeply nested');try{return fn();}finally{depth--;}}
  function atom():Expr {
    const token=tokens[pos++];let value:Expr;
    if(token==='(')value=nested(()=>{const e=sum();if(tokens[pos++]!==')')throw new Error('Missing closing parenthesis');return e;});
    else if(token==='|'){if(inAbs)throw new UnsupportedError('Nested absolute value');value=nested(()=>{inAbs=true;const e=sum();if(tokens[pos++]!=='|')throw new Error('Missing absolute value bar');inAbs=false;return {kind:'call',fn:'abs',args:[e]} as Expr;});}
    else if(/^\d/.test(token??''))value=num(token);
    else if(token==='pi')value={kind:'constant',name:'pi'};
    else if((FUNCTIONS as readonly string[]).includes(token))value=nested(()=>{const args:Expr[]=[];if(peek()==='('){pos++;args.push(sum());while(peek()===','){pos++;args.push(sum());}if(tokens[pos++]!==')')throw new Error('Missing closing parenthesis');}else args.push(atom());if(args.length!==(token==='root'?2:token==='log'?args.length:1)||args.length>2)throw new Error('Invalid function arity');return {kind:'call',fn:token as FunctionName,args};});
    else if(/^[a-z]$/.test(token??''))value={kind:'variable',name:token};
    else throw new Error('Expected number or variable');
    while(peek()==='°'){pos++;value=binary('/',binary('*',value,{kind:'constant',name:'pi'}),num('180'));}
    return value;
  }
  function power():Expr {const left=atom();if(peek()==='^'){pos++;return binary('^',left,nested(unary));}return left;}
  function unary():Expr {if(peek()==='+'||peek()==='-'){const op=tokens[pos++],value=nested(unary);return op==='-'?{kind:'neg',value}:value;}return power();}
  function product():Expr {let left=unary();while(peek()==='*'||peek()==='/'||peek()==='('||peek()==='|'&&!inAbs||/^[a-z]+$/.test(peek()??'')){const op=peek()==='*'||peek()==='/'?tokens[pos++] as '*'|'/':'*';left=binary(op,left,unary());}return left;}
  function sum():Expr {let left=product();while(peek()==='+'||peek()==='-'){const op=tokens[pos++] as '+'|'-';left=binary(op,left,product());}return left;}
  const left=sum();let relation:Relation|undefined,right:Expr|undefined;
  if(['=','<','<=','>','>='].includes(peek())){relation=tokens[pos++] as Relation;right=sum();}
  if(pos!==tokens.length)throw new UnsupportedError('Multiple relations or unsupported syntax');
  return {left,relation,right};
}

