import Button from '@/components/Button/Button';
import { StartReview } from './StartReview';
import styles from '../learn.module.css';
export function ReviewPanel({due}:{due:{id:string;name:string}[]}) {return <section className={styles.card}><h2>오늘의 복습</h2>{due.length>0?<><p>복습할 주제 {due.length}개</p><ul className={styles.reviewTopics}>{due.map(row=><li key={row.id}>{row.name===row.id?'복습할 주제':row.name}</li>)}</ul><StartReview/></>:<><p>오늘은 복습이 없어요</p><Button href="/learn" size="lg" fullWidth>학습 홈으로</Button></>}</section>;}
