import styles from './StatusBadge.module.css';

export type ProgramStatus = 'open' | 'closed' | 'comingSoon';
const labels = { open: '운영 중', closed: '모집 마감', comingSoon: '준비 중' };
export default function StatusBadge({ status }: { status: ProgramStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}><span aria-hidden="true" className={styles.dot} />{labels[status]}</span>;
}
