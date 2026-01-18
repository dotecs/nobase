'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import styles from '../auth.module.css';

function DevLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClientSupabaseClient();

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
          },
        });

        if (error) {
          setError(error.message);
        } else {
          setError('');
          alert('회원가입 성공! 이메일을 확인해주세요. (개발 환경에서는 Supabase 대시보드에서 이메일 확인을 비활성화할 수 있습니다.)');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          router.push(returnTo);
        }
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 개발 환경이 아니면 접근 차단
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <h1 className={styles.title}>접근 불가</h1>
            <p className={styles.subtitle}>
              이 페이지는 개발 환경에서만 사용할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div style={{ 
            background: '#fef3c7', 
            color: '#92400e', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ⚠️ 개발 환경 전용 로그인 페이지
          </div>

          <h1 className={styles.title}>
            {mode === 'login' ? '개발자 로그인' : '테스트 계정 생성'}
          </h1>
          <p className={styles.subtitle}>
            이메일/비밀번호로 로그인합니다
          </p>

          {error && <div className={styles.errorAlert}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>이메일</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="dev@example.com"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>비밀번호</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '계정 생성'}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {mode === 'login' ? '테스트 계정 생성하기' : '로그인으로 돌아가기'}
            </button>
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              <a href="/login" className={styles.link}>← 소셜 로그인으로 돌아가기</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DevLoginPage() {
  return (
    <Suspense fallback={
      <div className={styles.authPage}>
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    }>
      <DevLoginContent />
    </Suspense>
  );
}
