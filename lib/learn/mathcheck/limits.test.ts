import { describe,it,expect } from 'vitest';
import { parseMath } from './parse';
import { toLatex } from './latex';
import { AnswerSpec } from '../answer-spec';
describe('math input resource boundaries',()=>{
 it('renders 600 tokens but rejects 601',()=>{const max='-'+Array(300).fill('1').join('+');expect(toLatex(parseMath(max)).match(/\+1/g)).toHaveLength(299);expect(()=>parseMath(Array(301).fill('1').join('+'))).toThrow('Too many tokens');});
 it('accepts depth 40 but rejects depth 41',()=>{expect(toLatex(parseMath('('.repeat(40)+'x'+')'.repeat(40)))).toBe('x');expect(()=>parseMath('('.repeat(41)+'x'+')'.repeat(41))).toThrow('Too deeply nested');});
 it('keeps the 4000 character input boundary',()=>{expect(toLatex(parseMath(' '.repeat(3999)+'1'))).toBe('1');expect(()=>parseMath(' '.repeat(4000)+'1')).toThrow('Expression too long');});
 it('preserves rational specs while accepting finite variable-free constants',()=>{for(const value of ['-2/3','0.50','pi/4','2sqrt(3)'])for(const type of ['number','fraction'])expect(AnswerSpec.safeParse({type,value}).success).toBe(true);for(const value of ['x+1','ln(0)','1/0'])expect(AnswerSpec.safeParse({type:'number',value}).success).toBe(false);});
});

