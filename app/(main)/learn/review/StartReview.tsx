'use client';
import { useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startReview } from '../actions';
import styles from '../learn.module.css';
export function StartReview(){const [pending,start]=useTransition(),[error,setError]=useState(''),router=useRouter();return <><button className={styles.button} disabled={pending} onClick={()=>start(async()=>{const result=await startReview();if('id' in result&&result.id)router.push(`/learn/session/${result.id}`);else setError('error' in result?result.error:'empty_reason' in result&&result.empty_reason==='no_due_reviews'?'지금 복습할 소주제가 없습니다.':'새 복습 문항이 부족합니다. 코치에게 문의해 주세요.');})}>{pending?'준비 중…':'복습 시작'}</button>{error&&<p role="status">{error}</p>}</>;}
