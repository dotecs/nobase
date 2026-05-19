'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import styles from '../auth.module.css';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  
  const [error, setError] = useState('');
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSocialLogin = async (provider: 'google' | 'kakao') => {
    setSocialLoading(provider);
    setError('');

    try {
      const supabase = createClientSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`,
        },
      });

      if (error) {
        setError(error.message);
        setSocialLoading(null);
      }
    } catch {
      setError('소셜 로그인 중 오류가 발생했습니다.');
      setSocialLoading(null);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.logoSection}>
            <Image
              src="/logo_kr_b.png"
              alt="노베이스구조대"
              width={200}
              height={40}
              className={styles.logoImage}
              priority
            />
          </div>

          <h1 className={styles.title}>로그인</h1>
          <p className={styles.subtitle}>
            소셜 계정으로 간편하게 시작하세요
          </p>

          {error && <div className={styles.errorAlert}>{error}</div>}

          <div className={styles.socialButtons}>
            <button
              type="button"
              className={`${styles.socialButton} ${styles.kakaoButton}`}
              onClick={() => handleSocialLogin('kakao')}
              disabled={socialLoading !== null}
            >
              <svg className={styles.socialIcon} viewBox="0 0 24 24">
                <path fill="#000000" d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.89 5.31 4.68 6.71l-.95 3.54c-.08.31.27.55.53.37l4.23-2.81c.49.06 1 .09 1.51.09 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
              </svg>
              <span>{socialLoading === 'kakao' ? '연결 중...' : '카카오로 시작하기'}</span>
            </button>

            {/* TEMP: 레거시 사용자 카카오 매칭 마이그레이션 기간 동안 Google 로그인 비활성화.
                매칭이 끝나면 아래 블록을 다시 활성화하세요. */}
            {/*
            <button
              type="button"
              className={styles.socialButton}
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
            >
              <svg className={styles.socialIcon} viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{socialLoading === 'google' ? '연결 중...' : 'Google로 시작하기'}</span>
            </button>
            */}
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              처음이신가요? 소셜 계정으로 바로 시작할 수 있어요!
            </p>
            <p className={styles.termsText}>
              로그인 시 <a href="/terms" className={styles.link}>이용약관</a> 및 <a href="/privacy" className={styles.link}>개인정보처리방침</a>에 동의하게 됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
