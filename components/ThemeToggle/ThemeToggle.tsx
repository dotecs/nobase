'use client';

import { useEffect, useState } from 'react';
import { FaSun, FaMoon, FaDesktop } from 'react-icons/fa';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle({ segmented = false }: { segmented?: boolean }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // 초기 로드 시 저장된 테마 가져오기
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', newTheme);
    }
  };

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  if (segmented) return <div className={styles.segmented} role="group" aria-label="테마 선택">
    {(['light', 'dark', 'system'] as const).map(value => <button type="button" key={value}
      aria-pressed={mounted && theme === value} onClick={() => { setTheme(value); localStorage.setItem('theme', value); applyTheme(value); }}>
      {value === 'light' ? <FaSun aria-hidden="true" /> : value === 'dark' ? <FaMoon aria-hidden="true" /> : <FaDesktop aria-hidden="true" />}
      {value === 'light' ? '라이트' : value === 'dark' ? '다크' : '자동'}
    </button>)}
  </div>;

  // 서버 사이드 렌더링 시 hydration mismatch 방지
  if (!mounted) {
    return (
      <button className={styles.toggle} aria-label="테마 변경">
        <span className={styles.icon}><FaMoon /></span>
      </button>
    );
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <FaSun />;
      case 'dark':
        return <FaMoon />;
      case 'system':
        return <FaDesktop />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return '라이트 모드';
      case 'dark':
        return '다크 모드';
      case 'system':
        return '시스템 설정';
    }
  };

  return (
    <button 
      className={styles.toggle} 
      onClick={toggleTheme}
      aria-label={`현재 ${getLabel()}, 클릭하여 변경`}
      title={getLabel()}
    >
      <span className={styles.icon}>{getIcon()}</span>
    </button>
  );
}
