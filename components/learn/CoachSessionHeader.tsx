import type { SessionPhoto } from '@/lib/learn/session-photos';
import { SessionPhotoThumbnails } from './SessionPhotoPanel';
import styles from './session-photos.module.css';
export function CoachSessionHeader({kind,startedAt,photos}:{kind:string;startedAt:string;photos:SessionPhoto[]}) {
  const diagnostic=kind==='diagnostic';
  return <header className={styles.sessionHeader}><h3><span className={styles.kindBadge} data-kind={kind}>{diagnostic?'진단':kind==='review'?'복습':'학습'}</span> <time dateTime={startedAt}>{new Date(startedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</time></h3><p className={photos.length?'':diagnostic?styles.warning:styles.muted}>{photos.length?`사진 ${photos.length}장`:diagnostic?'진단 사진 대기':'사진 없음'}</p><SessionPhotoThumbnails photos={photos}/></header>;
}
