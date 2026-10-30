import {FiPlay,FiPause} from 'react-icons/fi';
import {formatTimelineTime,PLAYBACK_RATES} from '@/lib/learn/lessons/timeline';
import styles from './player.module.css';
export function Transport({time,total,playing,rate,captions,onPlay,onPause,onSeek,onRate,onCaptions,audio}:{time:number;total:number;playing:boolean;rate:number;captions:boolean;onPlay:()=>void;onPause:()=>void;onSeek:(time:number)=>void;onRate:(rate:number)=>void;onCaptions:()=>void;audio:boolean}){return <div className={styles.player} aria-label={audio?'음성 재생':'자막 모드'}>
 <button type="button" className={styles.play} aria-label={playing?'일시정지':'재생'} onClick={playing?onPause:onPlay}>{playing?<FiPause/>:<FiPlay/>}</button>
 <input className={styles.scrub} type="range" aria-label="재생 위치" aria-valuetext={formatTimelineTime(time)} min={0} max={total} step={10} value={time} onChange={e=>onSeek(Number(e.target.value))}/>
 <span className={styles.time}>{formatTimelineTime(time)} / {formatTimelineTime(total)}</span>
 <select className={styles.speed} aria-label="재생 속도" value={rate} onChange={e=>onRate(Number(e.target.value))}>{PLAYBACK_RATES.map(v=><option key={v} value={v}>{v}×</option>)}</select>
 <button type="button" className={styles.captions} aria-label="자막 켜기/끄기" aria-pressed={captions} onClick={onCaptions}>자막</button>
 </div>;}
