import { Suspense } from 'react';
import { FaLifeRing } from 'react-icons/fa';
import SignupForm from './SignupForm';
import styles from '../auth.module.css';

function SignupLoading() {
  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.logoSection}>
            <div className={styles.logo}><FaLifeRing /></div>
            <div className={styles.logoText}>노베이스구조대</div>
          </div>
          <h1 className={styles.title}>회원가입</h1>
          <p className={styles.subtitle}>로딩 중...</p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupForm />
    </Suspense>
  );
}
