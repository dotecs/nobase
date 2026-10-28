import { describe,it,expect } from 'vitest';
import { requiresPhoto,stepsPhotoMinimum } from './steps-photo';
import { checkSteps } from './mathcheck/steps';
describe('optional steps/photo configuration',()=>{
  const valid=checkSteps('2x+10=4','number',['2x=-6','x=-3']);
  it('default false and historical configs preserve required photo',()=>{expect(requiresPhoto(true,{},valid)).toBe(true);expect(requiresPhoto(true,{steps_replace_photo:false,steps_min_lines:2},valid)).toBe(true);expect(stepsPhotoMinimum({})).toBeNull();});
  it('enabled setting requires enough server-verified equivalent lines',()=>{
    const config={steps_replace_photo:true,steps_min_lines:2};expect(requiresPhoto(true,config,valid)).toBe(false);
    expect(requiresPhoto(true,config,checkSteps('2x+10=4','number',['?','x=3']))).toBe(true);expect(requiresPhoto(true,config,null)).toBe(true);
  });
});
