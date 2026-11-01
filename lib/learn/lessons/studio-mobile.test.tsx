import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import StudioShell,{shouldAutoHideTransport} from '@/components/studio/StudioShell';
import {StageControls} from '@/components/studio/stages/StageControls';
import {studioDemo} from './studio-demo';
it.each([[true,true,false],[true,false,true],[false,true,false],[false,false,false]])('transport auto-hide: focused=%s coarse=%s → %s',(focused,coarse,expected)=>{expect(shouldAutoHideTransport(focused,coarse)).toBe(expected);});
it('marks slider layout without duplicating its input or accessible label',()=>{const scene=structuredClone(studioDemo.scenes[0]);if(scene.stage.type!=='slider')throw Error('Expected slider fixture');scene.stage.param.control='slider';const html=renderToStaticMarkup(<StudioShell scene={scene} stage={<div/>} controls={<StageControls scene={scene} value={1} onExplore={()=>{}} onGrab={()=>{}}/>}/>);expect(html).toContain('data-slider="true"');expect((html.match(/aria-label="계수 a 슬라이더"/g)??[])).toHaveLength(1);expect(html).toContain('for="'+scene.id+'-param"');});
it('keeps stepper layout separate from the mobile full-width slider',()=>{const html=renderToStaticMarkup(<StudioShell scene={studioDemo.scenes[0]} stage={<div/>}/>);expect(html).toContain('data-slider="false"');});
