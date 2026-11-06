import {FiPlay,FiPause,FiType} from 'react-icons/fi';
import {formatTimelineTime,PLAYBACK_RATES} from '@/lib/learn/lessons/timeline';
import styles from './player.module.css';
export function Transport({time,total,playing,rate,captions,onPlay,onPause,onSeek,onRate,onCaptions,audio,chapters}:{time:number;total:number;playing:boolean;rate:number;captions:boolean;onPlay:()=>void;onPause:()=>void;onSeek:(time:number)=>void;onRate:(rate:number)=>void;onCaptions:()=>void;audio:boolean;chapters?:{time:number;title:string}[]}){return <div className={styles.player} aria-label={audio?'음성 재생':'자막 모드'}>
 <button type="button" className={styles.play} title={playing?'일시정지':'재생'} aria-label={playing?'일시정지':'재생'} onClick={playing?onPause:onPlay}>{playing?<FiPause/>:<FiPlay/>}</button>
 <div className={styles.track}><input className={styles.scrub} style={{['--progress' as string]:(total>0?Math.min(100,time/total*100):0)+'%'}} type="range" aria-label="재생 위치" aria-valuetext={formatTimelineTime(time)} min={0} max={total} step={10} value={time} onChange={e=>onSeek(Number(e.target.value))}/>{chapters?.slice(1).map(chapter=><span key={chapter.time} className={styles.chapter} style={{left:(chapter.time/total*100)+'%'}} title={chapter.title} aria-label={chapter.title}/>)}</div>
 <span className={styles.time}>{formatTimelineTime(time)} / {formatTimelineTime(total)}</span>
 <select className={styles.speed} aria-label="재생 속도" value={rate} onChange={e=>onRate(Number(e.target.value))}>{PLAYBACK_RATES.map(v=><option key={v} value={v}>{v}×</option>)}</select>
 <button type="button" className={styles.captions} title={captions?'자막 숨기기':'자막 표시'} aria-label="자막 켜기/끄기" aria-pressed={captions} onClick={onCaptions}><FiType aria-hidden="true"/></button>
 </div>;}
