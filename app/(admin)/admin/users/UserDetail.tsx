'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { FaArrowLeft, FaUser, FaUserShield, FaGraduationCap, FaTrash } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import { Database, UserRole } from '@/lib/database.types';
import styles from '../courses/courseForm.module.css';

interface Enrollment {
  id: string;
  status: string;
  cohort: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
}

interface UserDetailProps {
  user: {
    user_id: string;
    name: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
  };
  enrollments: Enrollment[];
}

export default function UserDetail({ user, enrollments }: UserDetailProps) {
  const router = useRouter();
  // Admin 페이지에서는 RLS 정책이 적용되지 않으므로 any 타입 사용
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();

  const [formData, setFormData] = useState({
    name: user.name || '',
    role: user.role,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name || null,
          role: formData.role as UserRole,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.user_id);

      if (error) throw error;

      await alert({
        title: '수정 완료',
        message: '사용자 정보가 성공적으로 수정되었습니다.',
        type: 'success',
      });

      router.refresh();
    } catch (error: any) {
      await alert({
        title: '오류 발생',
        message: error.message || '저장 중 오류가 발생했습니다.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveEnrollment = async (enrollmentId: string, cohortTitle: string) => {
    const confirmed = await confirm({
      title: '수강 취소',
      message: `"${cohortTitle}" 수강을 취소하시겠습니까?`,
      type: 'warning',
      confirmText: '취소하기',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;

      await alert({
        title: '완료',
        message: '수강이 취소되었습니다.',
        type: 'success',
      });

      router.refresh();
    } catch (error: any) {
      await alert({
        title: '오류 발생',
        message: error.message || '처리 중 오류가 발생했습니다.',
        type: 'error',
      });
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <Link href="/admin/users" className={styles.backLink}>
          <FaArrowLeft /> 목록으로 돌아가기
        </Link>
        <h1>사용자 상세</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            <FaUser /> 기본 정보
          </h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>사용자 ID</label>
            <input
              type="text"
              value={user.user_id}
              className={styles.input}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              이름
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.input}
              placeholder="사용자 이름"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="role" className={styles.label}>
              역할
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="student">학생</option>
              <option value="admin">관리자</option>
            </select>
            <span className={styles.helpText}>
              관리자 역할은 모든 콘텐츠에 접근할 수 있습니다.
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>가입일</label>
            <input
              type="text"
              value={new Date(user.created_at).toLocaleString('ko-KR')}
              className={styles.input}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>
        </div>

        {/* 수강 현황 */}
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            <FaGraduationCap /> 수강 현황 ({enrollments.length}개)
          </h2>

          {enrollments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-text)' }}>
                      {enrollment.cohort.course.title}
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                      {enrollment.cohort.title} · {enrollment.status === 'active' ? '수강 중' : enrollment.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveEnrollment(enrollment.id, enrollment.cohort.title)}
                    style={{
                      padding: 'var(--space-2)',
                      color: 'var(--color-error)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-md)',
                    }}
                    title="수강 취소"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-6)' }}>
              수강 중인 강좌가 없습니다.
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className={styles.formActions}>
          <Button type="button" variant="outline" href="/admin/users">
            취소
          </Button>
          <Button type="submit" loading={isSubmitting}>
            저장
          </Button>
        </div>
      </form>
    </main>
  );
}
