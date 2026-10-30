import {useMemo} from 'react';
import {InlineMath} from 'react-katex';
import type {Sentence} from '@/lib/learn/lessons/schema';
import type {Alignment} from '@/lib/learn/lessons/alignment';
import {captionWords,captionChunk} from '@/lib/learn/lessons/captions';
import {captionDuration} from '@/lib/learn/lessons/events';
import styles from './caption.module.css';
export function Caption({sentence,alignment=null,time=0,duration=captionDuration(sentence.text,1),worked=false}:{sentence:Sentence;alignment?:Alignment|null;time?:number;duration?:number;worked?:boolean}){
 const words=useMemo(()=>captionWords(sentence,alignment,duration),[sentence,alignment,duration]);
 return <div className={styles.caption} aria-label="현재 자막">{worked&&<span className={styles.role} data-role={sentence.role}>{sentence.role==='think'?'머릿속':sentence.role==='write'?'종이에':'설명'}</span>}<div className={styles.lines}>{captionChunk(words,time).map((word,i)=><span key={i} data-spoken={time>=word.start} className={styles.word}>{word.space?' ':''}{word.emphasis?<strong>{word.math?<InlineMath math={word.math}/>:word.text}</strong>:word.math?<InlineMath math={word.math}/>:word.text}</span>)}</div></div>;
}
