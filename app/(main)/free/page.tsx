import Link from 'next/link';
import { FiVideo } from 'react-icons/fi';
import root from '@/content/curricula/root-math.json';
import Header from '@/components/Header/Header';
import { getUser, getProfile } from '@/lib/supabase-server';
import type { Profile } from '@/lib/database.types';
import type { Curriculum } from '@/lib/learn/lessons/curriculum';
import { FREE_GUEST_LESSON_ID, FREE_GUEST_COUNT, COACHING_CTA, isGuestLesson } from '@/lib/learn/lessons/free-access';
import { originalMaterials } from '@/lib/learn/lessons/free-materials';
import styles from './free.module.css';

export const metadata = { title: '뿌리깊은수학 무료 강의', description: '수 체계부터 함수까지, 수학 기초를 처음부터 다시 쌓는 20강 무료 강의', robots: { index: false, follow: false } };

const lessonHref = (id: string) => '/learn/lesson/' + encodeURIComponent(id);
const loginHref = '/login?returnTo=' + encodeURIComponent('/free');

export default async function FreeLessonsPage({ searchParams }: { searchParams: Promise<{ textbook?: string }> }) {
  const [user, profileData, materials, query] = await Promise.all([getUser(), getProfile(), originalMaterials(), searchParams]);
  const profile = profileData as Profile | null;
  const curriculum = root as Curriculum;
  return <div className={styles.page}>
    <Header glassHeader userName={profile?.name || user?.email} isLoggedIn={!!user} userRole={profile?.role} />
    <main className={styles.main}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>무료 강의 · 뿌리깊은수학</p>
        <h1 className={styles.title}>수학 기초,<br />처음부터 다시 쌓기</h1>
        <p className={styles.lead}>수 체계부터 함수까지 20강. 화면에 필기가 나타나고 설명이 음성으로 이어지는 강의라, 기초가 없어도 순서대로 따라오면 됩니다.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={lessonHref(FREE_GUEST_LESSON_ID)}>1강 바로 보기</Link>
          {!user && <Link className={styles.secondary} href={loginHref}>카카오 로그인하고 전체 보기</Link>}
        </div>
        <p className={styles.note}>{user ? '로그인되어 있어 20강과 동영상 강의·교재를 모두 볼 수 있어요. 본 강의는 자동으로 기록돼요.' : `1~${FREE_GUEST_COUNT}강은 로그인 없이, ${FREE_GUEST_COUNT + 1}강부터와 동영상 강의·교재는 카카오 로그인 후 무료로 볼 수 있어요.`}</p>
      </section>
      {materials.textbook && <section className={styles.textbook}>
        <div><h2>교재</h2><p>강의와 같은 순서로 정리된 「뿌리깊은수학」 통합본 PDF{user ? '' : ' · 카카오 로그인 후 받기'}</p>
          {query.textbook && <p role="alert" className={styles.alert}>교재를 열지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>}</div>
        <a className={styles.secondaryOutline} href="/free/textbook">교재 PDF 받기</a>
      </section>}
      <section className={styles.list} aria-label="강의 목록">
        {curriculum.chapters.map(chapter => <div key={chapter.no} className={styles.chapter}>
          <h2>{String(chapter.no).padStart(2, '0')} {chapter.title}</h2>
          <ol>{chapter.items.map(item => { const video = materials.videos[item.title.trim()]; return <li key={item.lesson_id} className={styles.row}>
            <Link className={styles.lesson} href={lessonHref(item.lesson_id)}><span className={styles.no}>{item.no}강</span><span className={styles.name}>{item.title}</span>{!user && isGuestLesson(item.lesson_id) && <span className={styles.badge}>로그인 없이</span>}</Link>
            {video && <Link className={styles.video} href={lessonHref(item.lesson_id) + '?video=1'} aria-label={`${item.title} 동영상 강의`}><FiVideo aria-hidden="true" />동영상 강의</Link>}
          </li>; })}</ol>
        </div>)}
      </section>
      <section className={styles.cta}>
        <h2>혼자 따라가기 막막하다면</h2>
        <p>어디서 막히는지 진단하고, 막힌 개념부터 다시 잡아 드립니다.</p>
        <a className={styles.primary} href={COACHING_CTA.href} target="_blank" rel="noopener noreferrer">{COACHING_CTA.label}</a>
      </section>
    </main>
  </div>;
}
