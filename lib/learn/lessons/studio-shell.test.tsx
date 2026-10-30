import { it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import StudioShell from '@/components/studio/StudioShell';
import { prototypeLesson } from './prototype-fixture';
it('renders one scene with headline emphasis and stage/player/control slots',()=>{const scene=prototypeLesson().scenes[0];scene.headline={eyebrow:'이차함수',title:'눈으로 이해하다',accent:'눈으로',subtitle:'그래프를 움직여요.'};const html=renderToStaticMarkup(<StudioShell scene={scene} stage={<span>무대</span>} controls={<input aria-label="a"/>} player={<button>재생</button>} navigation={<button>다음 내용</button>}/>);expect(html).toContain('<em>눈으로</em>');expect(html).toContain('data-layout="stage-right"');for(const text of ['집중 모드','무대','재생','다음 내용'])expect(html).toContain(text);});
it('defaults step/chain scenes to split and supports explicit light theme',()=>{const html=renderToStaticMarkup(<StudioShell scene={prototypeLesson().scenes[1]} stage="무대" theme="light"/>);expect(html).toContain('data-layout="split"');expect(html).toContain('data-theme="light"');});
it('scopes a viewport shell and responsive layouts without hardcoded colors',()=>{const css=readFileSync('components/studio/studio.module.css','utf8');expect(css).toContain('height: 100dvh');expect(css).toContain('minmax(300px, 1fr) minmax(0, 2fr)');expect(css).toContain('max-width: 767px');expect(css).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/i);});
