import {FiSkipForward} from 'react-icons/fi';
import type {Scene} from '@/lib/learn/lessons/schema';
import {SceneNav} from './SceneNav';
import styles from './navigation.module.css';
export function LessonNavigation({admin,sceneBar,onScope,player,scenes,index,ended,waiting,onContinue,onMove,onComplete,autoAdvance,onToggleAutoAdvance,completionLabel}:{admin:boolean;sceneBar:boolean;onScope:()=>void;player:React.ReactNode;scenes:Scene[];index:number;ended:boolean;waiting:boolean;onContinue:()=>void;onMove:(index:number)=>void;onComplete:()=>void;autoAdvance:boolean;onToggleAutoAdvance:()=>void;completionLabel:string}){
  const options=<div className={styles.options}>{waiting&&<button type="button" className={styles.continue} onClick={onContinue}>계속</button>}{admin&&<button type="button" className={styles.autoAdvance} aria-label="장면별 재생 막대" aria-pressed={sceneBar} onClick={onScope}>{sceneBar?'장면 시간':'강 전체 시간'}</button>}<button type="button" className={styles.autoAdvance} aria-label="다음 강 자동 재생" aria-pressed={autoAdvance} onClick={onToggleAutoAdvance}><FiSkipForward/><span>다음 강 자동 재생</span><small>{autoAdvance?'켬':'끔'}</small></button></div>;
  return <div className={styles.lessonNav}>{admin?<SceneNav scenes={scenes} index={index} ended={ended} player={player} onMove={onMove} onComplete={onComplete} completionLabel={completionLabel}/>:<div className={styles.transport}>{player}</div>}{options}</div>;
}
