'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

/**
 * URL에 ?migrated=1 (선택: &e=N, &p=N) 이 있으면 환영 토스트를 한 번 띄우고
 * 해당 쿼리 파라미터를 제거해 새로고침/뒤로가기 시 재노출 방지.
 *
 * auth callback이 마이그레이션 자동 매칭 성공 시 redirect URL에 부착함.
 */
export default function MigrationWelcomeToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (params.get('migrated') !== '1') return;
    shownRef.current = true;

    const enrollments = Number(params.get('e') || 0);
    const progress = Number(params.get('p') || 0);
    const cohortTitlesRaw = params.get('c') || '';
    const cohortTitles = cohortTitlesRaw
      ? cohortTitlesRaw.split('|').filter(Boolean)
      : [];

    let title: string;
    let message: string;

    if (cohortTitles.length === 1) {
      title = `${cohortTitles[0]} 기존 수강생으로 확인되셨습니다`;
      const detailParts: string[] = [];
      if (progress > 0) detailParts.push(`이전 학습 진도 ${progress}건`);
      const detail = detailParts.length > 0 ? ` ${detailParts.join(', ')}이(가) 복원됐어요.` : '';
      message = `별도 수강신청 없이 바로 이어서 학습하실 수 있습니다.${detail}`;
    } else if (cohortTitles.length > 1) {
      title = '기존 수강 이력이 확인되셨습니다';
      message = `${cohortTitles.join(', ')} 등 ${enrollments}건의 수강이 자동 등록됐어요.${
        progress > 0 ? ` 학습 진도 ${progress}건도 복원됐습니다.` : ''
      } 별도 수강신청 없이 바로 이어서 학습하실 수 있습니다.`;
    } else {
      // cohort 정보가 없지만 마이그레이션은 성공한 경우
      title = '기존 수강생이시군요';
      const parts: string[] = [];
      if (enrollments > 0) parts.push(`수강 ${enrollments}건`);
      if (progress > 0) parts.push(`학습 진도 ${progress}건`);
      const detail = parts.length > 0 ? ` (${parts.join(', ')} 복원)` : '';
      message = `기존 수강 이력을 자동으로 불러왔어요${detail}. 이어서 학습해보세요!`;
    }

    toast(message, {
      type: 'success',
      title,
      duration: 8000,
    });

    // 쿼리 파라미터 제거 (새로고침 시 토스트 재표시 방지)
    const next = new URLSearchParams(params);
    next.delete('migrated');
    next.delete('e');
    next.delete('p');
    next.delete('c');
    const q = next.toString();
    router.replace(`${pathname}${q ? `?${q}` : ''}`);
  }, [params, router, pathname, toast]);

  return null;
}
