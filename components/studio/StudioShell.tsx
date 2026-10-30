'use client';
import { useEffect,useRef,useState,type ReactNode } from 'react';
import Link from 'next/link';
import { FiMaximize,FiMinimize } from 'react-icons/fi';
import BrandLogo from '@/components/BrandLogo/BrandLogo';
import type { Scene } from '@/lib/learn/lessons/schema';
import styles from './studio.module.css';
type Props={scene:Scene;stage:ReactNode;controls?:ReactNode;player?:ReactNode;navigation?:ReactNode;theme?:'dark'|'light'};
export default function StudioShell({scene,stage,controls,player,navigation,theme}:Props){
 const root=useRef<HTMLElement>(null),[focused,setFocused]=useState(false);
 const exit=()=>{setFocused(false);if(document.fullscreenElement===root.current)void document.exitFullscreen().catch(()=>{});};
 useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setFocused(false);if(document.fullscreenElement===root.current)void document.exitFullscreen().catch(()=>{});}};const change=()=>{if(!document.fullscreenElement)setFocused(false);};document.addEventListener('keydown',escape);document.addEventListener('fullscreenchange',change);return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('fullscreenchange',change);};},[]);
 const headline=scene.headline,title=headline?.title??scene.title,accent=headline?.accent;
 const index=accent?title.indexOf(accent):-1;
 return <main ref={root} className={styles.studio} data-studio data-theme={theme} data-focus={focused} data-layout={scene.layout??(['steps','chain'].includes(scene.stage.type)?'split':'stage-right')} aria-label="러닝 스튜디오">
  <header className={styles.topbar}><Link href="/learn" aria-label="학습 홈" className={styles.logo}><BrandLogo/></Link><button type="button" className={styles.focusButton} onClick={()=>{setFocused(true);void root.current?.requestFullscreen?.().catch(()=>{});}}><FiMaximize aria-hidden="true"/>집중 모드</button></header>
  {focused&&<button type="button" className={`${styles.focusButton} ${styles.exitFocus}`} onClick={exit}><FiMinimize aria-hidden="true"/>집중 모드 종료</button>}
  <div className={styles.content}>
   <aside className={styles.panel}><div className={styles.heading}>{headline?.eyebrow&&<p className={styles.eyebrow}>{headline.eyebrow}</p>}<h1>{index<0?title:<>{title.slice(0,index)}<em>{accent}</em>{title.slice(index+accent!.length)}</>}</h1>{headline?.subtitle&&<p className={styles.subtitle}>{headline.subtitle}</p>}</div>
    {controls&&<details className={styles.controls} open><summary>직접 움직여 보기</summary><div className={styles.controlBody}>{controls}</div></details>}
   </aside>
   <div className={styles.stageColumn}><div className={styles.stage}>{stage}</div>{player&&<div className={styles.playerSlot}>{player}</div>}</div>
  </div>
  <footer className={styles.navigation}>{navigation}</footer>
 </main>;
}
