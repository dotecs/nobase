import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {StageControls} from '@/components/studio/stages/StageControls';
import {spacedTicks} from './equal-graph';
import {sliderVerdict} from './stage-controls';
import {studioDemo} from './studio-demo';
it('renders exact parameter fractions and rational discriminants',()=>{const scene=structuredClone(studioDemo.scenes[0]);if(scene.stage.type!=='slider')throw Error();scene.stage.expr='x^2+3x+k';scene.stage.param.name='k';scene.stage.verdict='discriminant';expect(sliderVerdict(scene,27/16)).toBe('D = \\tfrac{9}{4} · 서로 다른 두 실근');const html=renderToStaticMarkup(<StageControls scene={scene} value={9/4} onGrab={()=>{}} onExplore={()=>{}}/>);expect(html).toContain('katex');expect(html).toContain('\\tfrac{9}{4}');expect(html).toContain('D = 0');expect(html).toContain('value="2.25"');});
it('uses half-unit ticks on a sub-unit axis range',()=>expect(spacedTicks([-.5,.5],400)).toEqual([-.5,0,.5]));
