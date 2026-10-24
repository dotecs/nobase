import Image from 'next/image';
import styles from './BrandLogo.module.css';

export default function BrandLogo({ footer = false, compact }: { footer?: boolean; compact?: boolean }) {
  if (compact !== undefined && !footer) return <span className={styles.switcher} data-compact={compact}>
    <Image src="/brand/logo-kr.svg" alt="노베이스구조대" width={160} height={37} priority className={`${styles.logo} ${styles.wordmark}`} style={{ width: '100%', height: 'auto' }} />
    <Image src="/brand/symbol.svg" alt="" aria-hidden="true" width={25} height={33} priority className={`${styles.logo} ${styles.symbol}`} style={{ width: '17.1035%', height: '98.3785%' }} />
  </span>;
  return <Image src="/brand/logo-kr.svg" alt="노베이스구조대" width={160} height={37} priority={!footer} className={`${styles.logo} ${footer ? styles.footer : ''}`} />;
}
