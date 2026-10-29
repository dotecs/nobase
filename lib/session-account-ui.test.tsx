import { describe,it,expect,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
import { MobileAccountFooter } from '@/components/Header/MobileAccountFooter';
import { PadAccount } from '@/components/learn/PadAccount';
import { AdminLearnNotice } from '@/components/learn/AdminLearnNotice';
describe('mobile account controls',()=>{
  it('mobile sidebar renders logout only when logged in',()=>{expect(renderToStaticMarkup(<MobileAccountFooter isLoggedIn/>)).toContain('로그아웃');const anonymous=renderToStaticMarkup(<MobileAccountFooter isLoggedIn={false}/>);expect(anonymous).not.toContain('로그아웃');expect(anonymous).toContain('href="/login"');});
  it('pad shows the current account and account switching',()=>{const html=renderToStaticMarkup(<PadAccount name="테스트 학생"/>);expect(html).toContain('테스트 학생 계정으로 입력 중');expect(html).toContain('다른 계정으로 로그인');});
  it('admin preview notice links to the learner list',()=>{const html=renderToStaticMarkup(<AdminLearnNotice/>);expect(html).toContain('관리자 계정입니다. 학생 흐름은 테스트 계정으로 확인해 주세요');expect(html).toContain('href="/admin/learn/learners"');});
});
