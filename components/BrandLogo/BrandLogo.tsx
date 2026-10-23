import Image from 'next/image';
import styles from './BrandLogo.module.css';

export default function BrandLogo({ footer = false }: { footer?: boolean }) {
  return <Image src="/brand/logo-kr.svg" alt="노베이스구조대" width={160} height={37} priority={!footer} className={`${styles.logo} ${footer ? styles.footer : ''}`} />;
}
