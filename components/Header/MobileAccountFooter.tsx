import Link from 'next/link';
import { LocalLogoutButton } from './LocalLogoutButton';
import styles from './Header.module.css';
export function MobileAccountFooter({isLoggedIn}:{isLoggedIn:boolean}) {
  return <div className={styles.sidebarFooter}>{isLoggedIn?<LocalLogoutButton className={styles.sidebarLink}/>:<Link href="/login" className={styles.sidebarLink}>로그인</Link>}</div>;
}
