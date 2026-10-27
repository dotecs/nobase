import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ uploads: 0 }));
vi.mock('@/lib/supabase-client', () => ({createClientSupabaseClient: () => ({auth:{getUser:async()=>({data:{user:{id:'user'}},error:null})},storage:{from:()=>({upload:async(path:string)=>{mock.uploads++;return{data:{path},error:null};}})}})}));
import { AnswerInput } from '@/components/learn/AnswerInput';
import { PhotoCapture } from '@/components/learn/PhotoCapture';
import { uploadAttemptPhoto } from '@/lib/storage';
describe('learner inputs', () => {
  it('numeric keypad includes signed fraction and decimal input with preview', () => { const html=renderToStaticMarkup(createElement(AnswerInput,{type:'number',value:'-3/4',onChange:()=>{}})); expect(html).toContain('숫자 키패드'); expect(html).toContain('−');expect(html).toContain('입력 미리보기'); });
  it('choice buttons render labels and selected state, no answer key', () => { const html=renderToStaticMarkup(createElement(AnswerInput,{type:'choice',value:['a'],options:[{id:'a',text_md:'Choice A'}],onChange:()=>{}}));expect(html).toContain('aria-pressed="true"');expect(html).not.toContain('correct'); });
  it.each([true,false])('photo required flag %s is supplied by the server', required => {const html=renderToStaticMarkup(createElement(PhotoCapture,{userId:'user',required,onChange:()=>{}}));expect(html).toContain(required?'(필수)':'(선택)');expect(html).toContain('capture="environment"');});
  it('photo upload checks owner and rejects unsupported files', async () => {
    const file = new File(['test'],'proof.png',{type:'image/png'});
    expect((await uploadAttemptPhoto('other',file)).error).not.toBeNull();
    expect((await uploadAttemptPhoto('user',new File(['x'],'bad.txt',{type:'text/plain'}))).error).not.toBeNull();
    expect(mock.uploads).toBe(0);
    expect((await uploadAttemptPhoto('user',file)).storagePath).toMatch(/^user\/attempts\//);expect(mock.uploads).toBe(1);
  });
});
