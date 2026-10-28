'use client';
import { useEffect,useRef,useState } from 'react';
import styles from './focus.module.css';
export function SessionTimer({remaining}:{remaining:number|null}) {
  const announced=useRef(new Set<number>()),[announcement,setAnnouncement]=useState('');
  useEffect(()=>{if(remaining===null)return;const threshold=remaining<=30?30:remaining<=120?120:null;if(threshold!==null&&!announced.current.has(threshold)){announced.current.add(threshold);setAnnouncement(threshold===30?'30초 남았습니다':'2분 남았습니다');}},[remaining]);
  const tone=remaining!==null&&remaining<=30?'error':remaining!==null&&remaining<=120?'warning':'normal';
  return <><span className={`${styles.timer} ${styles[tone]}`} data-tone={tone} aria-label="남은 시간">{remaining===null?'--:--':`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`}</span><span className={styles.srOnly} role="status" aria-live="polite">{announcement}</span></>;
}
