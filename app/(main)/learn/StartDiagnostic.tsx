'use client';
import { Button } from '@/components';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startDiagnostic } from './actions';
export function StartDiagnostic() {
  const [pending,start]=useTransition(),[error,setError]=useState(''),router=useRouter();
  return <><Button variant="primary" size="lg" fullWidth disabled={pending} onClick={()=>start(async()=>{const result=await startDiagnostic();if(result.error)setError(result.error);else router.push('/learn/diagnostic');})}>{pending?'진단 준비 중…':'진단 시작'}</Button>{error&&<p role="alert">{error}</p>}</>;
}
