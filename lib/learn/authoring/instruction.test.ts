import { describe,it,expect } from 'vitest';
import { hasInstruction } from './instruction';
describe('instructions outside math',()=>{
 it.each([
  ['$6(2x+3)$',false],['다음 식을 전개하시오. $6(2x+3)$',true],['다음을 계산하시오. $1+2$',true],['$x$를 구하시오',true],
  ['$$한글$$',false],['\\(한글\\)',false],['\\[한글\\]',false],['값 $1+2$',false],
 ])('%s -> %s',(stem,result)=>expect(hasInstruction(stem)).toBe(result));
});
