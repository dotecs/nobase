import Image from 'next/image';
import styles from './BrandLogo.module.css';

export default function BrandLogo({ footer = false, compact = false }: { footer?: boolean; compact?: boolean }) {
  return <Image src={compact ? '/brand/symbol.svg' : '/brand/logo-kr.svg'} alt="노베이스구조대" width={compact ? 25 : 160} height={compact ? 33 : 37} priority={!footer} className={`${styles.logo} ${footer ? styles.footer : ''}`} />;
}
