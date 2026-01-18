'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { FaArrowLeft, FaImage, FaBook, FaCloudUploadAlt, FaTrash } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import { uploadCourseThumbnail, validateImageFile } from '@/lib/storage';
import styles from './courseForm.module.css';

interface CourseFormProps {
  initialData?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    thumbnail_url: string | null;
    is_published: boolean;
  };
  children?: React.ReactNode;
}

export default function CourseForm({ initialData, children }: CourseFormProps) {
  const router = useRouter();
  // Admin 페이지에서는 RLS 정책이 적용되지 않으므로 any 타입 사용
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    thumbnail_url: initialData?.thumbnail_url || '',
    is_published: initialData?.is_published || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const isEditMode = !!initialData;

  // 슬러그 자동 생성
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      // 새 강좌일 때만 슬러그 자동 생성
      slug: isEditMode ? prev.slug : generateSlug(title),
    }));
    setErrors((prev) => ({ ...prev, title: '' }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // 슬러그는 자동으로 소문자, 공백->하이픈 변환
    if (name === 'slug') {
      const sanitizedSlug = value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      setFormData((prev) => ({ ...prev, [name]: sanitizedSlug }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      await alert({
        title: '업로드 실패',
        message: validation.error!,
        type: 'error',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 시뮬레이션 진행률 (실제로는 업로드 API가 진행률을 제공하지 않음)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const courseId = initialData?.id || 'temp-' + Date.now();
      const { url, error } = await uploadCourseThumbnail(courseId, file);

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      setUploadProgress(100);
      setFormData((prev) => ({ ...prev, thumbnail_url: url || '' }));

      await alert({
        title: '업로드 완료',
        message: '썸네일이 성공적으로 업로드되었습니다.',
        type: 'success',
      });
    } catch (error: any) {
      await alert({
        title: '업로드 실패',
        message: error.message || '파일 업로드 중 오류가 발생했습니다.',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [alert, initialData?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // 드래그 앤 드롭 처리
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // 썸네일 삭제
  const handleRemoveThumbnail = async () => {
    const confirmed = await confirm({
      title: '썸네일 삭제',
      message: '현재 썸네일을 삭제하시겠습니까?',
      type: 'warning',
    });

    if (confirmed) {
      setFormData((prev) => ({ ...prev, thumbnail_url: '' }));
    }
  };

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = '강좌 제목을 입력해주세요.';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = '슬러그를 입력해주세요.';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = '슬러그는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit 호출됨');
    console.log('현재 formData:', formData);

    if (!validateForm()) {
      console.log('유효성 검사 실패:', errors);
      return;
    }

    console.log('유효성 검사 통과');
    setIsSubmitting(true);

    try {
      const courseData = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        thumbnail_url: formData.thumbnail_url || null,
        is_published: formData.is_published,
      };

      console.log('저장할 데이터:', courseData);

      if (isEditMode) {
        // 수정
        const { error } = await supabase
          .from('courses')
          .update({
            ...courseData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialData.id);

        if (error) {
          console.error('수정 오류:', error);
          throw error;
        }

        await alert({
          title: '수정 완료',
          message: '강좌가 성공적으로 수정되었습니다.',
          type: 'success',
        });
      } else {
        // 생성
        const { data, error } = await supabase
          .from('courses')
          .insert(courseData)
          .select()
          .single();

        if (error) {
          console.error('생성 오류:', error);
          throw error;
        }

        console.log('생성된 강좌:', data);

        await alert({
          title: '생성 완료',
          message: '새 강좌가 성공적으로 생성되었습니다.',
          type: 'success',
        });

        router.push(`/admin/courses/${data.id}`);
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

  // 강좌 삭제
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '강좌 삭제',
      message: '정말 이 강좌를 삭제하시겠습니까? 관련된 모든 기수, 레슨, 수강 정보가 함께 삭제됩니다.',
      type: 'error',
      danger: true,
      confirmText: '삭제',
    });

    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', initialData!.id);

      if (error) throw error;

      await alert({
        title: '삭제 완료',
        message: '강좌가 성공적으로 삭제되었습니다.',
        type: 'success',
      });

      router.push('/admin');
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
        <Link href="/admin" className={styles.backLink}>
          <FaArrowLeft /> 목록으로 돌아가기
        </Link>
        <h1>{isEditMode ? '강좌 수정' : '새 강좌 만들기'}</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* 기본 정보 */}
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            <FaBook /> 기본 정보
          </h2>

          <div className={styles.formGroup}>
            <label htmlFor="title" className={styles.label}>
              강좌 제목 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleTitleChange}
              className={styles.input}
              placeholder="예: React 완전 정복"
            />
            {errors.title && (
              <span className={styles.errorText}>{errors.title}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="slug" className={styles.label}>
              슬러그 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className={styles.input}
              placeholder="예: react-mastery"
            />
            <span className={styles.helpText}>
              URL에 사용됩니다. 영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다.
            </span>
            {errors.slug && (
              <span className={styles.errorText}>{errors.slug}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              설명
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={styles.textarea}
              placeholder="강좌에 대한 간단한 설명을 입력해주세요."
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.toggleGroup}>
              <button
                type="button"
                className={`${styles.toggle} ${formData.is_published ? styles.active : ''}`}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, is_published: !prev.is_published }))
                }
              >
                <span className={styles.toggleKnob} />
              </button>
              <span className={styles.toggleLabel}>
                {formData.is_published ? '공개' : '비공개'}
              </span>
            </div>
            <span className={styles.helpText}>
              공개 상태로 설정하면 수강생들이 이 강좌를 볼 수 있습니다.
            </span>
          </div>
        </div>

        {/* 썸네일 */}
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            <FaImage /> 썸네일 이미지
          </h2>

          <div className={styles.thumbnailSection}>
            <div className={`${styles.thumbnailPreview} ${formData.thumbnail_url ? styles.hasImage : ''}`}>
              {formData.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={formData.thumbnail_url} alt="썸네일 미리보기" />
              ) : (
                <div className={styles.thumbnailPlaceholder}>
                  <FaImage />
                  <span>미리보기</span>
                </div>
              )}
            </div>

            <div className={styles.uploadControls}>
              <div
                className={`${styles.uploadArea} ${isDragOver ? styles.dragover : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className={styles.uploadIcon}>
                  <FaCloudUploadAlt />
                </div>
                <p className={styles.uploadText}>
                  <strong>클릭</strong>하거나 파일을 드래그하여 업로드
                </p>
                <p className={styles.uploadHint}>
                  JPEG, PNG, WebP, GIF (최대 5MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className={styles.hiddenInput}
                />
              </div>

              {isUploading && (
                <div className={styles.uploadProgress}>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className={styles.progressText}>업로드 중... {uploadProgress}%</p>
                </div>
              )}

              {formData.thumbnail_url && !isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveThumbnail}
                  style={{ marginTop: 'var(--space-3)' }}
                >
                  <FaTrash /> 썸네일 삭제
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className={styles.formActions}>
          <Button type="button" variant="outline" href="/admin">
            취소
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditMode ? '저장' : '강좌 생성'}
          </Button>
        </div>

        {/* 삭제 영역 (수정 모드에서만) */}
        {isEditMode && (
          <div className={`${styles.formSection} ${styles.dangerZone}`}>
            <h2 className={styles.sectionTitle}>
              <FaTrash /> 위험 구역
            </h2>
            <p className={styles.dangerDescription}>
              강좌를 삭제하면 관련된 모든 기수, 레슨, 수강 정보가 함께 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              loading={isSubmitting}
            >
              <FaTrash /> 강좌 삭제
            </Button>
          </div>
        )}
      </form>
      
      {children}
    </main>
  );
}
