'use client';
import { useEffect,useState } from 'react';
import Button from '@/components/Button/Button';
import styles from './session-photos.module.css';
export function SessionPhotoReminder({sessionId}:{sessionId:string}) {
  const [visible,setVisible]=useState(false);
  useEffect(()=>{try{setVisible(localStorage.getItem(`learn:photo-dismiss:${sessionId}`)!=='1');}catch{setVisible(true);}},[sessionId]);
  if(!visible)return null;
  return <aside className={styles.panel}><div><h2>지난 학습 사진 올리기</h2><button aria-label="사진 안내 닫기" onClick={()=>{try{localStorage.setItem(`learn:photo-dismiss:${sessionId}`,'1');}catch{}setVisible(false);}}>×</button></div><p>어제 학습의 풀이 사진을 올릴 수 있어요</p><Button href={`/learn/session/${sessionId}`} variant="outline" size="lg">풀이 사진 올리기</Button></aside>;
}
