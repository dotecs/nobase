import { readFileSync } from 'node:fs';
import { it,expect } from 'vitest';
it('learn inputs use the shared focus ring and design tokens without literal colors',()=>{
 const input=readFileSync('components/learn/input.module.css','utf8');
 for(const selector of ['.keypad button:focus-visible','.choices button:focus-visible','.photo button:focus-visible','.answer:focus-visible'])expect(input).toContain(selector);
 expect(input).toMatch(/outline:\s*none;\s*box-shadow:\s*var\(--focus-ring\)/);
 const page=readFileSync('app/(main)/learn/learn.module.css','utf8'),feedback=readFileSync('components/learn/feedback.module.css','utf8');
 for(const css of [page,feedback])for(const token of ['--radius-card','--color-border-brand','--shadow-card','--color-bg-elevated'])expect(css).toContain(token);
 expect(input).toContain('--radius-button');expect(page).toContain('padding: 5px 12px');expect(page).toContain('word-break: keep-all');
 for(const css of [page,feedback,input,readFileSync('components/learn/focus.module.css','utf8')])expect(css).not.toMatch(/#[0-9a-f]{6}/i);
});
