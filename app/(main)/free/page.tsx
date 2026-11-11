import Link from 'next/link';
import root from '@/content/curricula/root-math.json';
import Header from '@/components/Header/Header';
import { getUser, getProfile } from '@/lib/supabase-server';
import type { Profile } from '@/lib/database.types';
import type { Curriculum } from '@/lib/learn/lessons/curriculum';
import { FREE_GUEST_LESSON_ID, COACHING_CTA, lessonLoginHref } from '@/lib/learn/lessons/free-access';
import styles from './free.module.css';

export const metadata = { title: '뿌리깊은수학 무료 강의 | 노베이스구조대', description: '수 체계부터 함수까지, 수학 기초를 처음부터 다시 쌓는 20강 무료 강의', robots: { index: false, follow: false } };

const lessonHref = (id: string) => '/learn/lesson/' + encodeURIComponent(id);

export default async function FreeLessonsPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  const curriculum = root as Curriculum;
  return <div className={styles.page}>
    <Header glassHeader userName={(profile as Profile | null)?.name || user?.email} isLoggedIn={!!user} userRole={(profile as Profile | null)?.role} />
    <main className={styles.main}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>무료 강의 · 뿌리깊은수학</p>
        <h1 className={styles.title}>수학 기초,<br />처음부터 다시 쌓기</h1>
        <p className={styles.lead}>수 체계부터 함수까지 20강. 화면에 필기가 나타나고 설명이 음성으로 이어지는 강의라, 기초가 없어도 순서대로 따라오면 됩니다.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={lessonHref(FREE_GUEST_LESSON_ID)}>1강 바로 보기</Link>
          {!user && <Link className={styles.secondary} href={lessonLoginHref(FREE_GUEST_LESSON_ID)}>카카오 로그인하고 전체 보기</Link>}
        </div>
        <p className={styles.note}>{user ? '로그인되어 있어 20강 모두 볼 수 있어요. 본 강의는 자동으로 기록돼요.' : '1강은 로그인 없이, 2강부터는 카카오 로그인 후 무료로 볼 수 있어요.'}</p>
      </section>
      <section className={styles.list} aria-label="강의 목록">
        {curriculum.chapters.map(chapter => <div key={chapter.no} className={styles.chapter}>
          <h2>{String(chapter.no).padStart(2, '0')} {chapter.title}</h2>
          <ol>{chapter.items.map(item => <li key={item.lesson_id}>
            <Link href={lessonHref(item.lesson_id)}><span className={styles.no}>{item.no}강</span>{item.title}{item.lesson_id === FREE_GUEST_LESSON_ID && !user && <span className={styles.badge}>로그인 없이</span>}</Link>
          </li>)}</ol>
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
