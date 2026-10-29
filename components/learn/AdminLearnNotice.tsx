import Button from '@/components/Button/Button';
import styles from '@/app/(main)/learn/learn.module.css';
export function AdminLearnNotice() {
  return <section className={styles.card}><p>관리자 계정입니다. 학생 흐름은 테스트 계정으로 확인해 주세요</p><Button href="/admin/learn/learners" variant="outline">관리자 학습자 목록</Button></section>;
}
