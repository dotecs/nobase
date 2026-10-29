import { describe,it,expect } from 'vitest';
import { resizedPhotoSize } from './photo-resize';
describe('photo resize dimensions',()=>{
 it.each([[4000,3000,2000,1500],[3000,4000,1500,2000],[800,600,800,600],[2000,2000,2000,2000]])('fits %s x %s without enlargement',(w,h,width,height)=>expect(resizedPhotoSize(w,h)).toEqual({width,height}));
 it('rejects impossible dimensions',()=>expect(()=>resizedPhotoSize(0,100)).toThrow());
});
