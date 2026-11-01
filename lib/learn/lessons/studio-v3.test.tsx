import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('loads Poor Story only through studio route layouts without preload',()=>{const font=readFileSync('components/studio/font.ts','utf8');expect(font).toContain('Poor_Story');expect(font).toContain('preload:false');for(const p of ['app/layout.tsx','app/(main)/layout.tsx']){if(require('node:fs').existsSync(p))expect(readFileSync(p,'utf8')).not.toContain('studioHand');}});

import {renderToStaticMarkup} from 'react-dom/server';
import {CourseSidebar} from '@/components/studio/CourseSidebar';
import root from '@/content/curricula/root-math.json';
import {studioDemo} from './studio-demo';
import {currentChapter} from './curriculum';
it('opens chapter 02 and marks current or worked lessons while disabling unavailable entries',()=>{for(const id of ['rm-11','rm-11-w1']){expect(currentChapter(root,id)).toBe(2);const html=renderToStaticMarkup(<CourseSidebar lesson={{...studioDemo,id}} index={0} course={{curriculum:root,available:['rm-11','rm-11-w1']}}/>);expect(html).toContain('aria-current="page"');expect(html).toContain('aria-disabled="true"');expect(html).not.toContain('href="/learn/lesson/rm-01"');}});

import {formatNum,formulaValues} from './format-num';
import {lessonSchema} from './schema';
it('formats shared numbers and responds to parameter values in formulas',()=>{expect(formatNum(-2.3)).toBe('−2.3');expect(formatNum(2)).toBe('2');expect(formulaValues('a={{a}}',{a:1})).toBe('a=1');expect(formulaValues('a={{a}}',{a:2.5})).toBe('a=2.5');});
it('rejects formulas referencing undefined parameters',()=>{const lesson=structuredClone(studioDemo);lesson.scenes[0].headline!.formula='{{z}}';expect(lessonSchema.safeParse(lesson).success).toBe(false);});
