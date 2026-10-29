import { AnswerSpec } from '../answer-spec';
import { templatize,VariantRules } from './templatize';
import { readFileSync } from 'node:fs';
import { describe,it,expect } from 'vitest';
import { equivalent,equivalentWithMethod,numeric } from './evaluate';
import { parseMath } from './parse';
import { mathcheck } from '../solvers/mathcheck';
import { checkSteps } from './steps';
import { solveItem } from './solve';
import { hasFunctionNotation,variantLockMessage } from './template-lock';
describe('numeric fallback',()=>{
 it.each([['sqrt(12)','correct'],['3.4641','incorrect'],['2√3','correct']])('constant answer %s',(input,result)=>expect(mathcheck.grade('number',{type:'number',value:'2sqrt(3)',relation:'='},input).result).toBe(result));
 it('uses the explicit tolerance when supplied',()=>{expect(mathcheck.grade('number',{type:'number',value:'pi/4',relation:'='},'0.785').result).toBe('incorrect');expect(mathcheck.grade('number',{type:'number',value:'pi/4',relation:'=',tolerance:'0.001'},'0.785').result).toBe('correct');});
 it.each(['x+1','1/0','sqrt(-1)','∫x'])('rejects invalid constant answer %s',value=>expect(AnswerSpec.safeParse({type:'number',value}).success).toBe(false));
 it('locks function templates before solving',()=>{const sql=readFileSync('supabase/migrations/040_learn_content.sql','utf8'),rules=VariantRules.parse(JSON.parse(sql.match(/\('variants', 1, '([^']+)'::jsonb\)/)![1]));expect(templatize('sqrt(12)','number',rules).params.locked).toBe(true);});

 it.each([['sqrt(12)','2sqrt(3)',true],['sin(x)^2+cos(x)^2','1',true],['log(2,8)','3',true],['ln(exp(2))','2',true],['abs(-3)','3',true],['root(3,27)','3',true],['root(3,-27)','-3',true],['x^3-1','(x-1)(x^2+x+1)',true],['x/(x+1)','1',false],['sqrt(x)','-sqrt(x)',false],['sin(30°)','1/2',true],['sin(x+y)','sin(y+x)',true]])('%s vs %s',(a,b,result)=>expect(equivalent(parseMath(a).left,parseMath(b).left)).toBe(result));
 it('preserves token boundaries instead of silently merging input',()=>{expect(mathcheck.grade('number',{type:'number',value:'12',relation:'='},'1 2').result).toBe('input_issue');expect(mathcheck.grade('expression',{type:'expression',value:'sin(x)'},'\\sin x').result).toBe('correct');});
 it('keeps exact decisions before fallback',()=>expect(equivalentWithMethod(parseMath('x+x').left,parseMath('2x').left)).toEqual({equal:true,method:'exact'}));
 it('insufficient common domain goes to coach review',()=>{expect(mathcheck.grade('expression',{type:'expression',value:'log(-x)'},'log(x)')).toMatchObject({result:'pending_review',detail:{reason:'numeric_domain'}});});
 it.each(['0^0','sqrt(-1)','ln(0)','log(1,2)','root(2,-4)'])('undefined numerical value %s',input=>expect(Number.isFinite(numeric(parseMath(input).left))).toBe(false));
 it.each([['x<=-7','correct'],['-7','input_issue'],['x>=-7','incorrect']])('relation %s',(input,result)=>{expect(mathcheck.grade('number',{type:'number',value:'-7',variable:'x',relation:'<='},input).result).toBe(result);});
 it('allows a constant expression in the right side',()=>expect(mathcheck.grade('number',{type:'number',value:'7',variable:'x',relation:'<='},'x<=sqrt(49)').result).toBe('correct'));
 it('marks numeric step checks without changing auto-answer generation',()=>{expect(checkSteps('sqrt(12)','expression',['2sqrt(3)']).lines[0]).toMatchObject({status:'ok',method:'numeric'});expect(solveItem('sqrt(12)','number')).toEqual({ok:false,reason:'unsupported'});expect(hasFunctionNotation('$sqrt(12)$')).toBe(true);expect(variantLockMessage('sqrt(12)')).toContain('함수·상수');});
});
