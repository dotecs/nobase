'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startDiagnostic } from './actions';
import styles from './learn.module.css';
export function StartDiagnostic() {
  const [pending,start]=useTransition(),[error,setError]=useState(''),router=useRouter();
  return <><button className={styles.button} disabled={pending} onClick={()=>start(async()=>{const result=await startDiagnostic();if(result.error)setError(result.error);else router.push('/learn/diagnostic');})}>{pending?'진단 준비 중…':'진단 시작'}</button>{error&&<p role="alert">{error}</p>}</>;
}
