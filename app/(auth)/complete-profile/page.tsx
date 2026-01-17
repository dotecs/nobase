import CompleteProfileForm from './CompleteProfileForm';
import styles from '../auth.module.css';

export const dynamic = 'force-dynamic';

export default function CompleteProfilePage() {
  return (
    <div className={styles.authPage}>
      <CompleteProfileForm />
    </div>
  );
}
