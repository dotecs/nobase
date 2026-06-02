'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FaCheckCircle, FaGraduationCap, FaArrowRight } from 'react-icons/fa';
import styles from './MigrationWelcomeModal.module.css';

/**
 * URL에 ?migrated=1 (선택: &e=N, &p=N, &c=cohort1|cohort2) 이 있으면
 * 환영 모달을 한 번 띄우고 해당 쿼리 파라미터를 제거.
 *
 * auth callback이 마이그레이션 자동 매칭 성공 시 redirect URL에 부착함.
 */
export default function MigrationWelcomeToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shownRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<{
    title: string;
    cohortBadges: string[];
    description: string;
    extra?: string;
  } | null>(null);

  useEffect(() => {
    if (shownRef.current) return;
    const migrated = params.get('migrated');
    console.log('[migration-welcome] mount check, migrated param =', migrated);
    if (migrated !== '1') return;
    shownRef.current = true;

    const enrollments = Number(params.get('e') || 0);
    const progress = Number(params.get('p') || 0);
    const cohortTitlesRaw = params.get('c') || '';
    const cohortTitles = cohortTitlesRaw
      ? cohortTitlesRaw.split('|').filter(Boolean)
      : [];

    let title: string;
    let description: string;
    let extra: string | undefined;

    if (cohortTitles.length === 1) {
      title = '기존 수강생으로 확인되셨습니다';
      description = '별도 수강신청 없이 바로 이어서 학습하실 수 있어요.';
      if (progress > 0) extra = `이전 학습 진도 ${progress}건도 함께 복원됐어요.`;
    } else if (cohortTitles.length > 1) {
      title = '기존 수강 이력이 확인되셨습니다';
      description = `총 ${enrollments}개 강좌가 자동으로 등록됐어요. 별도 수강신청 없이 바로 학습하실 수 있습니다.`;
      if (progress > 0) extra = `이전 학습 진도 ${progress}건도 함께 복원됐어요.`;
    } else {
      title = '기존 수강생이시군요';
      description = '기존 수강 이력을 자동으로 불러왔어요. 이어서 학습해보세요!';
    }

    console.log('[migration-welcome] showing modal:', title);

    setContent({ title, cohortBadges: cohortTitles, description, extra });
    setOpen(true);

    // 쿼리 파라미터 제거 (새로고침 시 재노출 방지)
    const next = new URLSearchParams(params);
    next.delete('migrated');
    next.delete('e');
    next.delete('p');
    next.delete('c');
    const q = next.toString();
    router.replace(`${pathname}${q ? `?${q}` : ''}`);
  }, [params, router, pathname]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!open || !content) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.iconWrap}>
          <FaCheckCircle className={styles.icon} />
        </div>

        <h2 className={styles.title}>{content.title}</h2>

        {content.cohortBadges.length > 0 && (
          <div className={styles.badges}>
            {content.cohortBadges.map((c, i) => (
              <div key={i} className={styles.badge}>
                <FaGraduationCap className={styles.badgeIcon} />
                <span className={styles.badgeText}>{c}</span>
              </div>
            ))}
          </div>
        )}

        <p className={styles.description}>{content.description}</p>
        {content.extra && <p className={styles.extra}>{content.extra}</p>}

        <button
          type="button"
          className={styles.confirmButton}
          onClick={() => setOpen(false)}
        >
          학습 시작하기
          <FaArrowRight className={styles.confirmIcon} />
        </button>
      </div>
    </div>
  );
}
