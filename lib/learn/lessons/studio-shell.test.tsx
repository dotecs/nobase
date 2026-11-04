import { CourseSidebar } from '@/components/studio/CourseSidebar';
import { it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import StudioShell from '@/components/studio/StudioShell';
import { prototypeLesson } from './prototype-fixture';
it('renders one scene with headline emphasis and stage/player/control slots',()=>{const scene=prototypeLesson().scenes[0];scene.headline={eyebrow:'이차함수',title:'눈으로 이해하다',accent:'눈으로',subtitle:'그래프를 움직여요.'};const html=renderToStaticMarkup(<StudioShell scene={scene} stage={<span>무대</span>} controls={<input aria-label="a"/>} player={<button>재생</button>} navigation={<button>다음 내용</button>}/>);expect(html).toContain('눈으로 이해하다');expect(html).toContain('data-layout="stage-right"');for(const text of ['집중 모드','무대','다음 내용'])expect(html).toContain(text);});
it('defaults step/chain scenes to split and supports explicit light theme',()=>{const html=renderToStaticMarkup(<StudioShell scene={prototypeLesson().scenes[1]} stage="무대" theme="light"/>);expect(html).toContain('data-layout="split"');expect(html).toContain('data-theme="light"');});
it('scopes a viewport shell and responsive layouts without hardcoded colors',()=>{const css=readFileSync('components/studio/studio.module.css','utf8');expect(css).toContain('height: 100dvh');expect(css).toContain('280px minmax(0,1fr)');expect(css).toContain('max-width: 767px');expect(css).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/i);});

it('places the home logo inside the course aside',()=>{
 const html=renderToStaticMarkup(<CourseSidebar lesson={prototypeLesson()} index={0}/>);
 expect(html).toMatch(/<aside[^>]*>[\s\S]*aria-label="학습 홈"[\s\S]*<\/aside>/);
 expect(html).toContain('학습 스튜디오');
});
it('uses a transparent stage and an absolutely positioned transport dock',()=>{
 const css=readFileSync('components/studio/studio.module.css','utf8');
 expect(css).toMatch(/\.stageColumn \{[^}]*border:0;[^}]*background:transparent/);
 expect(css).toMatch(/\.navigation \{ position:absolute;[^}]*--studio-sidebar-width/);
 expect(css).toContain('grid-row:1/3');
});

it('lists all scene titles with one current scene and authored descriptions',()=>{
 const lesson=prototypeLesson();
 lesson.scenes[1].headline={title:'둘째 장면',subtitle:'이 장면의 설명'};
 const html=renderToStaticMarkup(<CourseSidebar lesson={lesson} index={1}/>);
 expect(html).toContain('aria-label="강의 장면 구성"');
 expect(html).toContain('둘째 장면');
 expect(html).toContain('이 장면의 설명');
 expect((html.match(/aria-current="step"/g)??[])).toHaveLength(1);
 expect((html.match(/data-scene-current=/g)??[])).toHaveLength(lesson.scenes.length);
 const moved=renderToStaticMarkup(<CourseSidebar lesson={lesson} index={0}/>);
 expect(moved).not.toContain('둘째 장면<em>현재</em>');
});
it('renders labeled icon actions and a left-aligned title',()=>{
 const html=renderToStaticMarkup(<StudioShell scene={prototypeLesson().scenes[0]} stage="무대" onAdminModeChange={()=>{}} adminMode/>);
 for(const label of ['관리자 모드','스튜디오 테마 전환','집중 모드'])expect(html).toContain('aria-label="'+label+'"');
 expect(html).toContain('title="라이트 모드로 전환"');
 expect(html).toMatch(/aria-label="관리자 모드"[^>]*><svg/);
 const css=readFileSync('components/studio/studio.module.css','utf8');
 expect(css).toMatch(/\.topTitle \{[^}]*text-align:left/);
 expect(css).toContain('width:44px; height:44px;');
});
