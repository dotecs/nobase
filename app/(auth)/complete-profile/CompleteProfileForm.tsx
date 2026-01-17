'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import styles from '../auth.module.css';
import formStyles from './complete-profile.module.css';

export default function CompleteProfileForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        // 이미 프로필이 완성되어 있으면 대시보드로
        if (profile.name && profile.phone) {
          router.push('/dashboard');
          return;
        }
        
        setFormData({
          name: profile.name || '',
          phone: profile.phone || '',
        });
      }
      
      setInitialLoading(false);
    };

    loadProfile();
  }, [router]);

  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');
    
    // 형식에 맞게 하이픈 추가
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 유효성 검사
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      setLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setError('전화번호를 입력해주세요.');
      setLoading(false);
      return;
    }

    const phoneRegex = /^01[0-9]-[0-9]{4}-[0-9]{4}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)');
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setError('로그인이 필요합니다.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: formData.name.trim(),
        phone: formData.phone,
      })
      .eq('user_id', user.id);

    if (updateError) {
      setError('프로필 저장 중 오류가 발생했습니다.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  if (initialLoading) {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <p style={{ textAlign: 'center' }}>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>프로필 완성</h1>
        <p className={styles.subtitle}>
          서비스 이용을 위해 추가 정보를 입력해주세요.
        </p>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={formStyles.inputGroup}>
            <label htmlFor="name" className={formStyles.label}>
              이름 <span className={formStyles.required}>*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="홍길동"
              className={formStyles.input}
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className={formStyles.inputGroup}>
            <label htmlFor="phone" className={formStyles.label}>
              전화번호 <span className={formStyles.required}>*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="010-1234-5678"
              className={formStyles.input}
              disabled={loading}
              autoComplete="tel"
              maxLength={13}
            />
            <p className={formStyles.hint}>
              중요한 공지사항 안내를 위해 사용됩니다.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={formStyles.submitButton}
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </form>

        <p className={formStyles.privacyNote}>
          입력하신 정보는 <a href="/privacy" target="_blank">개인정보처리방침</a>에 따라 안전하게 관리됩니다.
        </p>
      </div>
    </div>
  );
}
