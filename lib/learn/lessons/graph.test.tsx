import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StandardGraph } from '@/components/learn/StandardGraph';
import { graphScale,curvePath,integerTicks } from '@/lib/learn/lessons/graph';
describe('standard graph',()=>{
 it('uses the prototype coordinate scale',()=>{const s=graphScale([-4,4],[-5,7]);expect(s.sx(-4)).toBe(36);expect(s.sx(4)).toBe(624);expect(s.sy(7)).toBe(14);expect(s.sy(-5)).toBe(372);});
 it('samples 400 points and lifts the pen outside the viewport',()=>{expect(curvePath('x',[-1,1],[-2,2]).match(/[ML]/g)).toHaveLength(400);const path=curvePath('1/x',[-2,2],[-3,3]);expect(path.match(/M/g)).toHaveLength(2);expect(path).not.toMatch(/NaN|Infinity/);});
 it('omits nonfinite samples and lists integer ticks',()=>{expect(curvePath('sqrt(x)',[-2,-1],[-3,3])).toBe('');expect(integerTicks([-1.5,2.1])).toEqual([-1,0,1,2]);});
 it('renders accessible SVG, points, legend and token colors',()=>{const html=renderToStaticMarkup(<StandardGraph x={[-4,4]} y={[-5,7]} fns={[{expr:'x^2',c:'c1',label:'y=x²'}]} points={[{x:0,y:0,c:'c2'}]} aria="이차함수"/>);expect(html).toContain('viewBox="0 0 640 400"');expect(html).toContain('aria-label="이차함수"');expect(html).toContain('var(--color-primary)');expect(html).toContain('<circle');expect(html).toContain('>O<');});
});
