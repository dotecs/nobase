import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('loads Poor Story only through studio route layouts without preload',()=>{const font=readFileSync('components/studio/font.ts','utf8');expect(font).toContain('Poor_Story');expect(font).toContain('preload:false');for(const p of ['app/layout.tsx','app/(main)/layout.tsx']){if(require('node:fs').existsSync(p))expect(readFileSync(p,'utf8')).not.toContain('studioHand');}});

import {renderToStaticMarkup} from 'react-dom/server';
import {CourseSidebar} from '@/components/studio/CourseSidebar';
import root from '@/content/curricula/root-math.json';
import {studioDemo} from './studio-demo';
import {currentChapter} from './curriculum';
it('opens chapter 02 and marks current or worked lessons while disabling unavailable entries',()=>{for(const id of ['rm-11','rm-11-w1']){expect(currentChapter(root,id)).toBe(2);const html=renderToStaticMarkup(<CourseSidebar lesson={{...studioDemo,id}} index={0} course={{curriculum:root,available:['rm-11','rm-11-w1']}}/>);expect(html).toContain('aria-current="page"');expect(html).toContain('aria-disabled="true"');expect(html).not.toContain('href="/learn/lesson/rm-01"');}});
