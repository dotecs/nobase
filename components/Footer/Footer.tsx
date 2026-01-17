'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.mainRow}>
          <span className={styles.copyright}>© {currentYear} NOBASE</span>
          
          <button 
            className={`${styles.toggle} ${isExpanded ? styles.active : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <span className={styles.toggleText}>{isExpanded ? '접기' : '더보기'}</span>
            <span className={styles.toggleIcon}>
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>
        </div>
        
        <div className={`${styles.details} ${isExpanded ? styles.show : ''}`}>
          <div className={styles.detailsInner}>
            <div className={styles.info}>
              <span><span className={styles.label}>상호</span> <span className={styles.value}>도텍</span></span>
              <span className={styles.dot}>·</span>
              <span><span className={styles.label}>대표</span> <span className={styles.value}>한철민</span></span>
              <span className={styles.dot}>·</span>
              <span><span className={styles.label}>사업자등록번호</span> <span className={styles.value}>603-18-99267</span></span>
              <span className={styles.dot}>·</span>
              <span><span className={styles.label}>통신판매</span> <span className={styles.value}>2020-수원장안-1017</span></span>
            </div>
            
            <div className={styles.links}>
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy">개인정보처리방침</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
