import { renderToStaticMarkup } from 'react-dom/server';
import { describe,it,expect,vi } from 'vitest';
import { AnswerInput } from '@/components/learn/AnswerInput';
import { insertMathKey,keypadKeys,Keypad } from '@/components/learn/Keypad';
describe('one-field math input',()=>{
 it('keeps the full relation in one text field',()=>{const onChange=vi.fn(),html=renderToStaticMarkup(<AnswerInput type="number" relation_required variable="x" value="x<=-7" onChange={onChange}/>);expect(html).toContain('value="x&lt;=-7"');expect(html).toContain('placeholder="예: x&lt;=3"');expect(html).not.toContain('<fieldset');expect(onChange).not.toHaveBeenCalled();});
 it('hides relation keys only for scalar number/fraction answers',()=>{expect(keypadKeys(1,'number',false)).not.toContain('≤');expect(keypadKeys(1,'number',true)).toContain('≤');expect(keypadKeys(1,'expression')).toContain('=');expect(keypadKeys(1,'number',true,'y')[0]).toBe('y');});
 it('inserts unicode exactly and positions shortcut cursors',()=>{expect(insertMathKey('x',1,1,'≤')).toEqual({text:'x≤',cursor:2});expect(insertMathKey('2',1,1,'sqrt(')).toEqual({text:'2sqrt(',cursor:6});expect(insertMathKey('',0,0,'|x|')).toEqual({text:'||',cursor:1});});
 it('renders expression keypads and omits collapse on the pad',()=>{expect(renderToStaticMarkup(<AnswerInput type="expression" value="x" onChange={()=>{}}/>)).toContain('숫자 키패드');const html=renderToStaticMarkup(<Keypad alwaysExpanded onKey={()=>{}}/>);expect(html).not.toContain('키패드 접기');expect(html).toContain('함수');});
});
