'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { FiBookOpen, FiLogOut, FiShield } from 'react-icons/fi';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import styles from './AccountDropdown.module.css';

export default function AccountDropdown({ userName, userRole, onLogout }: {
  userName?: string | null;
  userRole?: 'student' | 'admin';
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const name = userName || '수강생';
  const initial = Array.from(name.trim())[0] || '나';

  useEffect(() => {
    let active = true;
    createClientSupabaseClient().auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email || '');
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('a, button')?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const logout = async () => {
    setPending(true); setError('');
    try { await onLogout(); setOpen(false); }
    catch { setError('로그아웃하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setPending(false); }
  };

  return <div ref={root} className={styles.root}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={`${name} 계정 메뉴`}
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span className={styles.avatar} aria-hidden="true">{initial}</span>
    </button>
    {open && <div ref={panel} id={id} className={styles.panel} role="region" aria-label="계정 설정">
      <div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{initial}</span><div className={styles.details}>
        <strong>{name}</strong>{email && email !== name && <span>{email}</span>}
      </div></div>
      <div className={styles.theme}><span className={styles.label}>테마</span><ThemeToggle segmented /></div>
      <div className={styles.links}>
        <Link href="/dashboard" onClick={() => setOpen(false)}><FiBookOpen aria-hidden="true" />내 강의실</Link>
        {userRole === 'admin' && <Link href="/admin" onClick={() => setOpen(false)}><FiShield aria-hidden="true" />관리자</Link>}
      </div>
      <button type="button" className={styles.logout} disabled={pending} onClick={logout}><FiLogOut aria-hidden="true" />{pending ? '로그아웃 중…' : '로그아웃'}</button>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>}
  </div>;
}
