import Header from '@/components/Header/Header';
import Button from '@/components/Button/Button';
import { getUser,getProfile } from '@/lib/supabase-server';
import type { Profile } from '@/lib/database.types';
import { reviewList } from '@/lib/learn/review-runtime';
import { runtimeError } from '@/lib/learn/runtime';
import { ReviewPanel } from './ReviewPanel';
import styles from '../learn.module.css';
export default async function ReviewPage(){
  const [user,profileData]=await Promise.all([getUser(),getProfile()]),profile=profileData as Profile|null;
  let content;
  try{content=<ReviewPanel due={await reviewList()}/>;}catch(error){content=<section className={styles.card}><p role="alert">{runtimeError(error, 'app/(main)/learn/review/page.tsx')}</p><Button href="/learn" size="lg" fullWidth>학습 홈으로</Button></section>;}
  return <><Header isLoggedIn={!!user} userName={profile?.name||user?.email} userRole={profile?.role}/><main className={styles.page}><h1>복습하기</h1>{content}</main></>;
}
