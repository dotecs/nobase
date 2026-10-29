import { LocalLogoutButton } from '@/components/Header/LocalLogoutButton';
import styles from './pad-account.module.css';
export function PadAccount({name}:{name:string}) {
  return <aside className={styles.account} aria-label="입력 계정"><span>{name} 계정으로 입력 중</span><LocalLogoutButton label="다른 계정으로 로그인" destination="/login?returnTo=/learn/pad" className={styles.switchAccount}/></aside>;
}
