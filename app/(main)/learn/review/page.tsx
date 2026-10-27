import Link from 'next/link';
import { reviewList } from '@/lib/learn/review-runtime';
import { runtimeError } from '@/lib/learn/runtime';
import { StartReview } from './StartReview';
import styles from '../learn.module.css';
export default async function ReviewPage(){try{const due=await reviewList();return <main className={styles.page}><h1>오늘의 복습</h1><section className={styles.card}><p>복습할 소주제 {due.length}개</p><ul>{due.map(row=><li key={row.id}>{row.id} · {row.name}</li>)}</ul>{due.length>0?<StartReview/>:<p>예정된 날짜에 다시 찾아주세요.</p>}</section><Link href="/learn">학습 홈으로</Link></main>;}catch(error){return <main className={styles.page}><p role="alert">{runtimeError(error, 'app/(main)/learn/review/page.tsx')}</p><Link href="/learn">학습 홈으로</Link></main>;}}
