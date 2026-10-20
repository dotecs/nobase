import styles from './loading.module.css';

export default function Loading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.status} role="status" aria-label="??? ?? ?">
        <span className={styles.dots} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>
    </main>
  );
}
