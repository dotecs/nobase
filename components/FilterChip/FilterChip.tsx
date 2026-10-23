'use client';

import { useRef } from 'react';
import styles from './FilterChip.module.css';

export default function FilterChip({ options, value, onChange, label }: {
  options: { id: string; label: string }[]; value: string; onChange: (id: string) => void; label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={styles.group} role="radiogroup" aria-label={label}>
    {options.map((option, index) => <button key={option.id} ref={element => { refs.current[index] = element; }} type="button" role="radio"
      aria-checked={value === option.id} tabIndex={value === option.id ? 0 : -1} className={styles.chip}
      onClick={() => onChange(option.id)} onKeyDown={event => {
        let next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = options.length - 1;
        else return;
        event.preventDefault(); onChange(options[next].id); refs.current[next]?.focus();
      }}>{option.label}</button>)}
  </div>;
}
