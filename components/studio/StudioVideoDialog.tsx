'use client';
import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import styles from './videoDialog.module.css';

/** 러닝 스튜디오 화면 위에서 원본 동영상 강의를 띄운다. 닫으면 iframe을 내려 재생도 멈춘다. */
export function StudioVideoDialog({ title, src, onClose }: { title: string; src: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current; if (el && !el.open) el.showModal(); return () => { if (el?.open) el.close(); }; }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-label={`${title} 동영상 강의`} onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={styles.head}><h2>동영상 강의 · {title}</h2><button type="button" className={styles.close} aria-label="닫기" onClick={onClose}><FiX aria-hidden="true" /></button></div>
    <div className={styles.frame}><iframe src={src} title={`${title} 동영상 강의`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>
  </dialog>;
}
