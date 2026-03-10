'use client';

import { useState, useRef } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { uploadQAAttachment, deleteQAAttachment, validateImageFile } from '@/lib/storage';
import { LessonQuestion } from '@/lib/database.types';
import { Button } from '@/components';
import { FaImage, FaTimes, FaClock } from 'react-icons/fa';
import styles from './question.module.css';

interface QuestionFormProps {
  lessonId: string;
  userId: string;
  question?: LessonQuestion;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function QuestionForm({
  lessonId,
  userId,
  question,
  onSuccess,
  onCancel,
}: QuestionFormProps) {
  const [content, setContent] = useState(question?.content || '');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(question?.image_url || null);
  const [existingImagePath] = useState<string | null>(question?.image_storage_path || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientSupabaseClient();

  // Parse existing timestamp
  useState(() => {
    if (question?.video_timestamp) {
      const match = question.video_timestamp.match(/(\d+)분\s*(\d+)초/);
      if (match) {
        setMinutes(match[1]);
        setSeconds(match[2]);
      }
    }
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || '파일 유효성 검사 실패');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('질문 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format timestamp
      let videoTimestamp: string | null = null;
      const minVal = parseInt(minutes) || 0;
      const secVal = parseInt(seconds) || 0;
      if (minVal > 0 || secVal > 0) {
        videoTimestamp = `${minVal}분 ${secVal.toString().padStart(2, '0')}초`;
      }

      // Handle image upload
      let imageUrl = question?.image_url || null;
      let imageStoragePath = question?.image_storage_path || null;

      if (imageFile) {
        // Delete old image if exists
        if (existingImagePath) {
          await deleteQAAttachment(existingImagePath);
        }

        // Upload new image
        const { url, storagePath, error: uploadError } = await uploadQAAttachment(userId, imageFile);
        if (uploadError) {
          throw uploadError;
        }
        imageUrl = url;
        imageStoragePath = storagePath;
      } else if (!imagePreview && existingImagePath) {
        // User removed the image
        await deleteQAAttachment(existingImagePath);
        imageUrl = null;
        imageStoragePath = null;
      }

      if (question) {
        // Update existing question
        const { error: updateError } = await (supabase
          .from('lesson_questions') as any)
          .update({
            content: content.trim(),
            video_timestamp: videoTimestamp,
            image_url: imageUrl,
            image_storage_path: imageStoragePath,
          })
          .eq('id', question.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new question
        const { error: insertError } = await (supabase
          .from('lesson_questions') as any)
          .insert({
            lesson_id: lessonId,
            user_id: userId,
            content: content.trim(),
            video_timestamp: videoTimestamp,
            image_url: imageUrl,
            image_storage_path: imageStoragePath,
          });

        if (insertError) {
          throw insertError;
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving question:', err);
      setError(err.message || '질문 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.questionForm}>
      <div className={styles.formTitle}>
        {question ? '질문 수정' : '새 질문 작성'}
      </div>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label}>질문 내용 *</label>
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="궁금한 점을 자세히 적어주세요..."
          rows={4}
          disabled={loading}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <FaClock className={styles.labelIcon} />
          강의 지점 (선택)
        </label>
        <div className={styles.timestampInputs}>
          <div className={styles.timestampGroup}>
            <input
              type="number"
              className={styles.timestampInput}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              min="0"
              disabled={loading}
            />
            <span className={styles.timestampLabel}>분</span>
          </div>
          <div className={styles.timestampGroup}>
            <input
              type="number"
              className={styles.timestampInput}
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              placeholder="00"
              min="0"
              max="59"
              disabled={loading}
            />
            <span className={styles.timestampLabel}>초</span>
          </div>
        </div>
        <span className={styles.helpText}>질문이 발생한 강의 시간을 입력하면 답변에 도움이 됩니다.</span>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <FaImage className={styles.labelIcon} />
          이미지 첨부 (선택)
        </label>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelect}
          className={styles.fileInput}
          disabled={loading}
        />

        {!imagePreview && (
          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <FaImage /> 이미지 선택
          </button>
        )}

        {imagePreview && (
          <div className={styles.imagePreviewContainer}>
            <img
              src={imagePreview}
              alt="첨부 이미지 미리보기"
              className={styles.imagePreview}
            />
            <button
              type="button"
              className={styles.removeImageButton}
              onClick={handleRemoveImage}
              disabled={loading}
            >
              <FaTimes />
            </button>
          </div>
        )}
        <span className={styles.helpText}>JPEG, PNG, WebP, GIF (최대 5MB)</span>
      </div>

      <div className={styles.formActions}>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          취소
        </Button>
        <Button
          type="submit"
          loading={loading}
        >
          {question ? '수정 완료' : '질문 등록'}
        </Button>
      </div>
    </form>
  );
}
