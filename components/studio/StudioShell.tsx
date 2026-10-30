'use client';
import { useCallback,useEffect,useRef,useState,type ReactNode } from 'react';
import Link from 'next/link';
import { FiMaximize,FiMinimize } from 'react-icons/fi';
import BrandLogo from '@/components/BrandLogo/BrandLogo';
import type { Scene } from '@/lib/learn/lessons/schema';
import styles from './studio.module.css';
import {StageFit} from './stages/StageFit';
type Props={scene:Scene;stage:ReactNode;controls?:ReactNode;player?:ReactNode;caption?:ReactNode;navigation?:ReactNode;theme?:'dark'|'light';onThemeChange?:(theme:'dark'|'light')=>void;overlay?:ReactNode;frame?:boolean;chrome?:boolean;focusMode?:boolean;onFocusChange?:(value:boolean)=>void};
export default function StudioShell({scene,stage,controls,player,caption,navigation,theme,onThemeChange,overlay,frame=false,chrome=true,focusMode,onFocusChange}:Props){
 const playerRef=useRef<HTMLDivElement>(null),[playerHeight,setPlayerHeight]=useState(56);
 useEffect(()=>{const element=playerRef.current;if(!element)return;const measure=()=>setPlayerHeight(element.offsetHeight);const observer=new ResizeObserver(measure);observer.observe(element);measure();return()=>observer.disconnect();},[]);
 const captionRef=useRef<HTMLDivElement>(null),[captionHeight,setCaptionHeight]=useState(0);
 useEffect(()=>{const el=captionRef.current;if(!el)return;const measure=()=>setCaptionHeight(el.offsetHeight);const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[]);
 const root=useRef<HTMLElement>(null),[localFocused,setLocalFocused]=useState(false),[localTheme,setLocalTheme]=useState<'dark'|'light'>(theme??'dark');
 const focused=focusMode??localFocused;
 const [transportVisible,setTransportVisible]=useState(true),idle=useRef<ReturnType<typeof setTimeout>|null>(null);
 const activity=useCallback(()=>{setTransportVisible(true);if(idle.current)clearTimeout(idle.current);if(focused)idle.current=setTimeout(()=>setTransportVisible(false),2000);},[focused]);
 useEffect(()=>{activity();return()=>{if(idle.current)clearTimeout(idle.current);};},[activity]);
 const setFocused=useCallback((value:boolean)=>{setLocalFocused(value);onFocusChange?.(value);},[onFocusChange]);
 const resolvedTheme=theme??localTheme;
 const toggleTheme=()=>{const next=resolvedTheme==='dark'?'light':'dark';setLocalTheme(next);onThemeChange?.(next);};
 const exit=()=>{setFocused(false);if(document.fullscreenElement===document.documentElement)void document.exitFullscreen().catch(()=>{});};
 useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!(event.target as HTMLElement).closest('dialog[open],[role="dialog"]')){setFocused(false);if(document.fullscreenElement===document.documentElement)void document.exitFullscreen().catch(()=>{});}};const change=()=>{if(!document.fullscreenElement)setFocused(false);};document.addEventListener('keydown',escape);document.addEventListener('fullscreenchange',change);return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('fullscreenchange',change);};},[setFocused]);
 const headline=scene.headline,title=headline?.title??scene.title,accent=headline?.accent;
 const index=accent?title.indexOf(accent):-1;
 return <main ref={root} style={{['--studio-player-height' as string]:playerHeight+'px',['--studio-caption-height' as string]:captionHeight+'px'}} onPointerMove={activity} onPointerDown={activity} onKeyDown={activity} className={styles.studio} data-studio data-theme={resolvedTheme} data-has-player={!!player} data-focus={focused} data-transport-visible={transportVisible} data-frame={frame} data-chrome={chrome} data-layout={scene.layout??(['steps','chain'].includes(scene.stage.type)?'split':'stage-right')} aria-label="러닝 스튜디오">
  <header className={styles.topbar}><Link href="/learn" aria-label="학습 홈" className={styles.logo}><BrandLogo/></Link><div className={styles.topActions}><button type="button" className={styles.focusButton} aria-label="스튜디오 테마 전환" aria-pressed={resolvedTheme==='light'} onClick={toggleTheme}>{resolvedTheme==='dark'?'라이트 모드':'다크 모드'}</button><button type="button" className={styles.focusButton} onClick={()=>{setFocused(true);void document.documentElement.requestFullscreen?.().catch(()=>{});}}><FiMaximize aria-hidden="true"/>집중 모드</button></div></header>
  {focused&&chrome&&<button type="button" className={`${styles.focusButton} ${styles.exitFocus}`} onClick={exit}><FiMinimize aria-hidden="true"/>집중 모드 종료</button>}
  <div className={styles.content}>
   <aside className={styles.panel}><div className={styles.heading}>{headline?.eyebrow&&<p className={styles.eyebrow}>{headline.eyebrow}</p>}<h1>{index<0?title:<>{title.slice(0,index)}<em>{accent}</em>{title.slice(index+accent!.length)}</>}</h1>{headline?.subtitle&&<p className={styles.subtitle}>{headline.subtitle}</p>}</div>
    {controls&&<details className={styles.controls} open><summary>직접 움직여 보기</summary><div className={styles.controlBody}>{controls}</div></details>}
   </aside>
   <div className={styles.stageColumn}><div key={scene.id} className={styles.stage}>{['graph','slider','figure'].includes(scene.stage.type)?stage:<StageFit>{stage}</StageFit>}</div>{player&&<div ref={captionRef} className={styles.captionSlot} data-empty={!caption}>{caption}</div>}{player&&<div ref={playerRef} className={styles.playerSlot}>{player}</div>}</div>
  </div>
  <footer className={styles.navigation}>{navigation}</footer>
  {overlay}
 </main>;
}
