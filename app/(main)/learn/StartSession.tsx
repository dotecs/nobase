'use client';
import { useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startSession } from './actions';
import styles from './learn.module.css';
export function StartSession(){const [pending,start]=useTransition(),[message,setMessage]=useState(''),router=useRouter();return <><button className={styles.button} disabled={pending} onClick={()=>start(async()=>{const result=await startSession();if('id' in result&&result.id)router.push(`/learn/session/${result.id}`);else setMessage('error' in result?result.error:'empty_reason' in result&&result.empty_reason==='all_goals_mastered'?'목표 학습을 마쳤습니다. 복습을 이어가세요.':'지금 추천할 문항이 없습니다. 코치에게 문의해 주세요.');})}>{pending?'준비 중…':'오늘 학습 시작'}</button>{message&&<p role="status">{message}</p>}</>;}
