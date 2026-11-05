'use client';
import {usePortrait} from '../StageLayout';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {fitStageScale} from '@/lib/learn/lessons/frame';
import styles from './stages.module.css';
export function StageFit({children,intrinsic=false}:{children:ReactNode;intrinsic?:boolean}){const portrait=usePortrait();const viewport=useRef<HTMLDivElement>(null),content=useRef<HTMLDivElement>(null),[scale,setScale]=useState(1);useEffect(()=>{const outer=viewport.current,inner=content.current;if(portrait||!outer||!inner)return;const measure=()=>setScale(fitStageScale(outer.clientWidth-12,outer.clientHeight-12,Math.max(inner.offsetWidth,inner.scrollWidth),Math.max(inner.offsetHeight,inner.scrollHeight)));const observer=new ResizeObserver(measure);observer.observe(outer);observer.observe(inner);measure();return()=>observer.disconnect();},[portrait]);if(portrait)return <div className={styles.portraitFit}>{children}</div>;return <div ref={viewport} className={styles.fit}><div ref={content} className={styles.fitContent} style={{width:intrinsic?'max-content':undefined,transform:'translate(-50%, -50%) scale('+scale+')'}}>{children}</div></div>;}
