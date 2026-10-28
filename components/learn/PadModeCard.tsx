'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button/Button';
import styles from './pad.module.css';
export function shouldEnterPad(narrow:boolean,open:boolean,preference:string|null) {return narrow&&open&&preference==='1';}
export function PadModeCard({hasOpenSession}:{hasOpenSession:boolean}) {
  const router=useRouter();
  useEffect(()=>{
    const media=window.matchMedia('(max-width: 767px)');
    const check=()=>{try{if(shouldEnterPad(media.matches,hasOpenSession,localStorage.getItem('learn:pad-mode')))router.replace('/learn/pad');}catch{/* Optional local preference. */}};
    check();media.addEventListener('change',check);return()=>media.removeEventListener('change',check);
  },[hasOpenSession,router]);
  if(!hasOpenSession)return null;
  return <section className={styles.entry}><p>노트북으로 풀고 있나요?</p><Button fullWidth onClick={()=>{try{localStorage.setItem('learn:pad-mode','1');}catch{/* Navigation still works. */}router.push('/learn/pad');}}>이 폰을 입력 패드로 쓰기</Button></section>;
}
