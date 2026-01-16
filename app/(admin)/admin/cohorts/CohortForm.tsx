'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { FaArrowLeft, FaGraduationCap, FaTrash } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import styles from '../courses/courseForm.module.css';

interface Course {
  id: string;
  title: string;
}

interface CohortFormProps {
  initialData?: {
    id: string;
    course_id: string;
    title: string;
    slug: string | null;
    starts_at: string | null;
    ends_at: string | null;
    is_active: boolean;
  };
}

export default function CohortForm({ initialData }: CohortFormProps) {
  const router = useRouter();
  // Admin 페이지에서는 RLS 정책이 적용되지 않으므로 any 타입 사용
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();

  const [courses, setCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState({
    course_id: initialData?.course_id || '',
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    starts_at: initialData?.starts_at?.split('T')[0] || '',
    ends_at: initialData?.ends_at?.split('T')[0] || '',
    is_active: initialData?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!initialData;

  // 강좌 목록 불러오기
  useEffect(() => {
    const fetchCourses = async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      
      if (data) {
        setCourses(data);
      }
    };
    fetchCourses();
  }, [supabase]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.course_id) {
      newErrors.course_id = '강좌를 선택해주세요.';
    }

    if (!formData.title.trim()) {
      newErrors.title = '기수 제목을 입력해주세요.';
    }

    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = '슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.';
    }

    if (formData.starts_at && formData.ends_at) {
      if (new Date(formData.starts_at) > new Date(formData.ends_at)) {
        newErrors.ends_at = '종료일은 시작일 이후여야 합니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        course_id: formData.course_id,
        title: formData.title,
        slug: formData.slug || null,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('cohorts')
          .update(payload)
          .eq('id', initialData.id);

        if (error) throw error;

        await alert({
          title: '수정 완료',
          message: '기수가 성공적으로 수정되었습니다.',
          type: 'success',
        });
      } else {
        const { data, error } = await supabase
          .from('cohorts')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        await alert({
          title: '생성 완료',
          message: '새 기수가 성공적으로 생성되었습니다.',
          type: 'success',
        });

        router.push(`/admin/cohorts/${data.id}`);
        return;
      }

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

  // 기수 삭제
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '기수 삭제',
      message: '정말 이 기수를 삭제하시겠습니까? 관련된 모든 레슨, 수강 정보가 함께 삭제됩니다.',
      type: 'error',
      danger: true,
      confirmText: '삭제',
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('cohorts')
        .delete()
        .eq('id', initialData!.id);

      if (error) throw error;

      await alert({
        title: '삭제 완료',
        message: '기수가 성공적으로 삭제되었습니다.',
        type: 'success',
      });

      router.push('/admin/cohorts');
    } catch (error: any) {
      await alert({
        title: '삭제 실패',
        message: error.message || '삭제 중 오류가 발생했습니다.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <Link href="/admin/cohorts" className={styles.backLink}>
          <FaArrowLeft /> 목록으로 돌아가기
        </Link>
        <h1>{isEditMode ? '기수 수정' : '새 기수 만들기'}</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            <FaGraduationCap /> 기수 정보
          </h2>

          <div className={styles.formGroup}>
            <label htmlFor="course_id" className={styles.label}>
              강좌 <span className={styles.required}>*</span>
            </label>
            <select
              id="course_id"
              name="course_id"
              value={formData.course_id}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="">강좌를 선택해주세요</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            {errors.course_id && (
              <span className={styles.errorText}>{errors.course_id}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              기수 제목 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={styles.input}
              placeholder="예: 1기, 2024년 상반기"
            />
            {errors.title && (
              <span className={styles.errorText}>{errors.title}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="slug" className={styles.label}>
              슬러그
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className={styles.input}
              placeholder="예: cohort-1"
            />
            <span className={styles.helpText}>
              URL에 사용됩니다. 비워두면 자동 생성됩니다.
            </span>
            {errors.slug && (
              <span className={styles.errorText}>{errors.slug}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="starts_at" className={styles.label}>
              시작일
            </label>
            <input
              type="date"
              id="starts_at"
              name="starts_at"
              value={formData.starts_at}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="ends_at" className={styles.label}>
              종료일
            </label>
            <input
              type="date"
              id="ends_at"
              name="ends_at"
              value={formData.ends_at}
              onChange={handleChange}
              className={styles.input}
            />
            {errors.ends_at && (
              <span className={styles.errorText}>{errors.ends_at}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <div className={styles.toggleGroup}>
              <button
                type="button"
                className={`${styles.toggle} ${formData.is_active ? styles.active : ''}`}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))
                }
              >
                <span className={styles.toggleKnob} />
              </button>
              <span className={styles.toggleLabel}>
                {formData.is_active ? '활성' : '비활성'}
              </span>
            </div>
            <span className={styles.helpText}>
              활성 상태로 설정하면 수강 신청 페이지에 표시됩니다.
            </span>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className={styles.formActions}>
          <Button type="button" variant="outline" href="/admin/cohorts">
            취소
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditMode ? '저장' : '기수 생성'}
          </Button>
        </div>

        {/* 삭제 영역 */}
        {isEditMode && (
          <div className={`${styles.formSection} ${styles.dangerZone}`}>
            <h2 className={styles.sectionTitle}>
              <FaTrash /> 위험 구역
            </h2>
            <p className={styles.dangerDescription}>
              기수를 삭제하면 관련된 모든 레슨, 수강 정보가 함께 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              loading={isSubmitting}
            >
              <FaTrash /> 기수 삭제
            </Button>
          </div>
        )}
      </form>
    </main>
  );
}
