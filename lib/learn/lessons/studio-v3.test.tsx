import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
it('loads Poor Story only through studio route layouts without preload',()=>{const font=readFileSync('components/studio/font.ts','utf8');expect(font).toContain('Poor_Story');expect(font).toContain('preload:false');for(const p of ['app/layout.tsx','app/(main)/layout.tsx']){if(require('node:fs').existsSync(p))expect(readFileSync(p,'utf8')).not.toContain('studioHand');}});
