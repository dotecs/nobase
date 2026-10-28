'use client';
import { useRef } from 'react';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { AnswerType } from '@/lib/learn/types';
import styles from './input.module.css';
export type AnswerValue = string | string[];
export function composeRelationAnswer(variable: string | null, relation: string, number: string) { return `${relation ? variable ?? '' : ''}${relation}${number.replace(/−/g, '-')}`; }
export function AnswerInput({ type, options = [], value, onChange, disabled = false, relation_required = false, variable = null }: { type: AnswerType; options?: { id: string; text_md: string }[]; value: AnswerValue; onChange: (value: AnswerValue) => void; disabled?: boolean; relation_required?: boolean; variable?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (type === 'choice') return <fieldset className={styles.choices} disabled={disabled}><legend>답을 선택하세요</legend>{options.map(option => <button key={option.id} type="button" aria-pressed={Array.isArray(value) && value.includes(option.id)} onClick={() => { const selected = Array.isArray(value) ? value : []; onChange(selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id]); }}>{renderMathMarkdown(option.text_md)}</button>)}</fieldset>;
  const text = typeof value === 'string' ? value : '';
  const previewText = relation_required ? text.replace(/>=/g, '\\ge ').replace(/<=/g, '\\le ') : text;
  if (type === 'photo' || type === 'text') return <label>풀이 설명{type === 'photo' && ' (선택)'}<textarea className={styles.answer} value={text} disabled={disabled} maxLength={4000} onChange={event => onChange(event.target.value)} /></label>;
  const parts = relation_required ? (variable && text.startsWith(variable) ? text.slice(variable.length) : text).match(/^(<=|>=|<|>)(.*)$/) : null;
  const relation = parts?.[1] ?? '', number = parts?.[2] ?? text;
  const changeNumber = (next: string) => onChange(relation_required ? composeRelationAnswer(variable, relation, next) : next);
  const insert = (key: string) => {
    const el = inputRef.current, start = el?.selectionStart ?? number.length, end = el?.selectionEnd ?? number.length;
    changeNumber(number.slice(0, start) + key + number.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + key.length, start + key.length); });
  };
  return <div className={styles.input}>
    {relation_required && <fieldset className={styles.choices} disabled={disabled}><legend>부등호를 선택하세요</legend>{[['<','<'],['<=','≤'],['>','>'],['>=','≥']].map(([key,label])=><button key={key} type="button" aria-pressed={relation===key} onClick={()=>onChange(composeRelationAnswer(variable,key,number))}>{label}</button>)}</fieldset>}
    <label>답 입력{relation_required && <span aria-label="변수"> {variable} </span>}<input ref={inputRef} className={styles.answer} type="text" inputMode={type === 'expression' ? 'text' : 'decimal'} autoComplete="off" value={number} disabled={disabled} maxLength={4000} onChange={event => changeNumber(event.target.value)} /></label>
    {type !== 'expression' && <div className={styles.keypad} aria-label="숫자 키패드">{['7','8','9','4','5','6','1','2','3','−','0','/','.'].map(key => <button key={key} type="button" disabled={disabled} onClick={() => insert(key)}>{key}</button>)}</div>}
    <div className={styles.preview} aria-label="입력 미리보기">{text ? renderMathMarkdown(`$${previewText.replace(/\$/g, '')}$`, { onError: 'message' }) : '입력한 답이 여기에 표시됩니다.'}</div>
  </div>;
}
