import { Button } from '@/components';
import styles from '../learn.module.css';
export function DiagnosticNotice({planIndex}:{planIndex:number}) {return planIndex===0?<aside className={styles.card}><p>정답은 진단이 끝난 뒤 코치가 알려드려요 · 모르면 비워 두지 말고 제출해 주세요</p></aside>:null;}
export function DiagnosticFinish({complete}:{complete:boolean}) {return <section className={styles.card}>{complete?<><span aria-hidden="true">✓</span><h2>진단을 마쳤어요</h2><p>코치가 확인하면 학습 홈에서 시작할 수 있어요</p></>:<h2>학습 홈에서 진단을 시작해 주세요</h2>}<Button href="/learn" size="lg" fullWidth>학습 홈으로</Button></section>;}
