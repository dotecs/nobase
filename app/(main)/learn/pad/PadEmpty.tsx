import Button from '@/components/Button/Button';
import { FocusShell } from '@/components/learn/FocusShell';
import styles from '../learn.module.css';
export function PadEmpty() {
  return <FocusShell title="입력 패드"><section className={styles.card}><p>지금 진행 중인 학습이 없어요. 노트북에서 학습을 시작한 뒤 다시 열어 주세요</p><Button href="/learn" fullWidth>학습 홈으로</Button></section></FocusShell>;
}
