'use client';
import { useRef } from 'react';
import { renderMathMarkdown } from '@/lib/math-markdown';
import type { AnswerType } from '@/lib/learn/types';
import styles from './input.module.css';
export type AnswerValue = string | string[];
export function AnswerInput({ type, options = [], value, onChange, disabled = false }: { type: AnswerType; options?: { id: string; text_md: string }[]; value: AnswerValue; onChange: (value: AnswerValue) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (type === 'choice') return <fieldset className={styles.choices} disabled={disabled}><legend>답을 선택하세요</legend>{options.map(option => <button key={option.id} type="button" aria-pressed={Array.isArray(value) && value.includes(option.id)} onClick={() => { const selected = Array.isArray(value) ? value : []; onChange(selected.includes(option.id) ? selected.filter(id => id !== option.id) : [...selected, option.id]); }}>{renderMathMarkdown(option.text_md)}</button>)}</fieldset>;
  const text = typeof value === 'string' ? value : '';
  if (type === 'photo' || type === 'text') return <label>풀이 설명{type === 'photo' && ' (선택)'}<textarea className={styles.answer} value={text} disabled={disabled} maxLength={4000} onChange={event => onChange(event.target.value)} /></label>;
  const insert = (key: string) => {
    const el = inputRef.current, start = el?.selectionStart ?? text.length, end = el?.selectionEnd ?? text.length;
    onChange(text.slice(0, start) + key + text.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + key.length, start + key.length); });
  };
  return <div className={styles.input}><label>답 입력<input ref={inputRef} className={styles.answer} type="text" inputMode={type === 'expression' ? 'text' : 'decimal'} autoComplete="off" value={text} disabled={disabled} maxLength={4000} onChange={event => onChange(event.target.value)} /></label>
    {type !== 'expression' && <div className={styles.keypad} aria-label="숫자 키패드">{['7','8','9','4','5','6','1','2','3','−','0','/','.'].map(key => <button key={key} type="button" disabled={disabled} onClick={() => insert(key)}>{key}</button>)}</div>}
    <div className={styles.preview} aria-label="입력 미리보기">{text ? renderMathMarkdown(`$${text.replace(/\$/g, '')}$`, { onError: 'message' }) : '입력한 답이 여기에 표시됩니다.'}</div>
  </div>;
}
