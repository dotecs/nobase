import { describe,it,expect,vi } from 'vitest';
import { VariantSelection } from './variant-selection';
describe('variant checkbox persistence',()=>{
  it('captures and serializes rapid toggles, including a second change to the same checkbox',async()=>{
    let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),stored=[true,true,true];
    const save=vi.fn(async(index:number,enabled:boolean)=>{if(save.mock.calls.length===1)await gate;stored[index]=enabled;return {};});
    const settled=vi.fn(),selection=new VariantSelection(stored,save,settled);
    const a=selection.toggle(0,false),b=selection.toggle(1,false),c=selection.toggle(0,true);
    expect(selection.getSnapshot()).toMatchObject({flags:[true,false,true],pending:3});
    await Promise.resolve();expect(save).toHaveBeenCalledTimes(1);release();await Promise.all([a,b,c]);
    expect(save.mock.calls).toEqual([[0,false],[1,false],[0,true]]);expect(stored).toEqual([true,false,true]);expect(selection.getSnapshot()).toEqual({flags:stored,pending:0,error:null});expect(settled).toHaveBeenCalledTimes(1);
  });
  it('failed saves restore confirmed flags and expose an error instead of a misleading count',async()=>{const selection=new VariantSelection([true],async()=>({error:'conflict'}),()=>{});await selection.toggle(0,false);expect(selection.getSnapshot()).toEqual({flags:[true],pending:0,error:'conflict'});});
});
