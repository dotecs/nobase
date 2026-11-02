'use client';
import { useCallback,useEffect,useRef,useState,type ReactNode } from 'react';
import Link from 'next/link';
import { FiMaximize,FiMinimize } from 'react-icons/fi';
import BrandLogo from '@/components/BrandLogo/BrandLogo';
import type { Scene } from '@/lib/learn/lessons/schema';
import styles from './studio.module.css';
import {StageFit} from './stages/StageFit';
export function shouldAutoHideTransport(focused:boolean,coarse:boolean){return focused&&!coarse;}
type Props={reference?:ReactNode;sidebar?:ReactNode;formula?:ReactNode;scene:Scene;stage:ReactNode;controls?:ReactNode;player?:ReactNode;caption?:ReactNode;navigation?:ReactNode;theme?:'dark'|'light';onThemeChange?:(theme:'dark'|'light')=>void;overlay?:ReactNode;frame?:boolean;chrome?:boolean;focusMode?:boolean;onFocusChange?:(value:boolean)=>void};
export default function StudioShell({reference,sidebar,formula,scene,stage,controls,player,caption,navigation,theme,onThemeChange,overlay,frame=false,chrome=true,focusMode,onFocusChange}:Props){
 const [drawerOpen,setDrawerOpen]=useState(false),drawer=useRef<HTMLDialogElement>(null),drawerButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const el=drawer.current;if(!el)return;if(drawerOpen&&!el.open)el.showModal();if(!drawerOpen&&el.open){el.close();drawerButton.current?.focus();}},[drawerOpen]);
 const playerRef=useRef<HTMLDivElement>(null),[playerHeight,setPlayerHeight]=useState(56);
 useEffect(()=>{const element=playerRef.current;if(!element)return;const measure=()=>setPlayerHeight(element.offsetHeight);const observer=new ResizeObserver(measure);observer.observe(element);measure();return()=>observer.disconnect();},[]);
 const captionRef=useRef<HTMLDivElement>(null),[captionHeight,setCaptionHeight]=useState(0);
 useEffect(()=>{const el=captionRef.current;if(!el)return;const measure=()=>setCaptionHeight(h=>Math.max(h,el.offsetHeight));const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[]);
 const root=useRef<HTMLElement>(null),[localFocused,setLocalFocused]=useState(false),[localTheme,setLocalTheme]=useState<'dark'|'light'>(theme??'dark');
 const focused=focusMode??localFocused;
 const [transportVisible,setTransportVisible]=useState(true),idle=useRef<ReturnType<typeof setTimeout>|null>(null);
 const activity=useCallback(()=>{setTransportVisible(true);if(idle.current)clearTimeout(idle.current);if(shouldAutoHideTransport(focused,window.matchMedia('(pointer: coarse)').matches))idle.current=setTimeout(()=>setTransportVisible(false),2000);},[focused]);
 useEffect(()=>{const pointer=window.matchMedia('(pointer: coarse)');activity();pointer.addEventListener('change',activity);return()=>{pointer.removeEventListener('change',activity);if(idle.current)clearTimeout(idle.current);};},[activity]);
 const setFocused=useCallback((value:boolean)=>{setLocalFocused(value);onFocusChange?.(value);},[onFocusChange]);
 const resolvedTheme=theme??localTheme;
 const toggleTheme=()=>{const next=resolvedTheme==='dark'?'light':'dark';setLocalTheme(next);onThemeChange?.(next);};
 const exit=()=>{setFocused(false);if(document.fullscreenElement===document.documentElement)void document.exitFullscreen().catch(()=>{});};
 useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&!(event.target as HTMLElement).closest('dialog[open],[role="dialog"]')){setFocused(false);if(document.fullscreenElement===document.documentElement)void document.exitFullscreen().catch(()=>{});}};const change=()=>{if(!document.fullscreenElement)setFocused(false);};document.addEventListener('keydown',escape);document.addEventListener('fullscreenchange',change);return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('fullscreenchange',change);};},[setFocused]);
 const headline=scene.headline,title=(headline?.title??scene.title).replace(/\n/g,' ');
 return <main ref={root} style={{['--studio-player-height' as string]:playerHeight+'px',['--studio-caption-height' as string]:captionHeight+'px'}} onPointerMove={activity} onPointerDown={activity} onKeyDown={activity} className={styles.studio} data-studio data-theme={resolvedTheme} data-slider={scene.stage.type==='slider'&&scene.stage.param.control==='slider'} data-has-player={!!player} data-focus={focused} data-transport-visible={transportVisible} data-frame={frame} data-chrome={chrome} data-layout={scene.layout??(['steps','chain'].includes(scene.stage.type)?'split':'stage-right')} aria-label="러닝 스튜디오">
  <header className={styles.topbar}><div className={styles.topLeft}><button ref={drawerButton} className={`${styles.focusButton} ${styles.courseButton}`} onClick={()=>setDrawerOpen(true)} aria-haspopup="dialog">과정</button><Link href="/learn" aria-label="학습 홈" className={styles.logo}><BrandLogo/></Link></div><div className={styles.topActions}><button type="button" className={styles.focusButton} aria-label="스튜디오 테마 전환" aria-pressed={resolvedTheme==='light'} onClick={toggleTheme}>{resolvedTheme==='dark'?'라이트 모드':'다크 모드'}</button><button type="button" className={styles.focusButton} onClick={()=>{setFocused(true);void document.documentElement.requestFullscreen?.().catch(()=>{});}}><FiMaximize aria-hidden="true"/>집중 모드</button></div></header>
  {focused&&chrome&&<button type="button" className={`${styles.focusButton} ${styles.exitFocus}`} aria-label="집중 모드 종료" onClick={exit}><FiMinimize aria-hidden="true"/><span className={styles.exitLabel}>집중 모드 종료</span></button>}
  <div className={styles.content}>
   <div className={styles.panel}>{sidebar}</div>
   <div className={styles.stageColumn}><div className={styles.stageHeader} data-reference={!!reference}><div>{headline?.eyebrow&&<p className={styles.eyebrow}>{headline.eyebrow}</p>}<h1 title={title}>{title}</h1></div><div>{formula}</div><div>{controls}</div>{reference&&<div className={styles.sceneReference}>{reference}</div>}</div><div key={scene.id} className={styles.stage}>{['graph','slider','figure'].includes(scene.stage.type)?stage:<StageFit intrinsic={scene.stage.type==='tree'}>{stage}</StageFit>}</div>{player&&<div ref={captionRef} className={styles.captionSlot} data-empty={!caption}>{caption}</div>}{player&&!navigation&&<div ref={playerRef} className={styles.playerSlot}>{player}</div>}</div>
  </div>
  <footer className={styles.navigation}>{navigation}</footer>
  <dialog ref={drawer} className={styles.drawer} aria-label="전체 교육 과정" onCancel={()=>setDrawerOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setDrawerOpen(false);}}><button type="button" className={styles.focusButton} onClick={()=>setDrawerOpen(false)}>닫기</button>{sidebar}</dialog>
  {overlay}
 </main>;
}
