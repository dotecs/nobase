'use client';

import { useState, useRef, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { uploadQAAnswerAttachment, validateImageFile } from '@/lib/storage';
import { Button } from '@/components';
import { FaImage, FaVideo, FaTimes, FaCalculator, FaEye } from 'react-icons/fa';
import styles from './questions.module.css';
import { InlineMath, BlockMath } from 'react-katex';

interface AnswerFormProps {
  questionId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// 수식 미리보기 렌더링
function renderPreview(content: string) {
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  while (remaining.includes('$$')) {
    const startIdx = remaining.indexOf('$$');
    const endIdx = remaining.indexOf('$$', startIdx + 2);
    
    if (endIdx === -1) break;
    
    if (startIdx > 0) {
      parts.push(...renderInlineMath(remaining.slice(0, startIdx), key));
      key += 100;
    }
    
    const mathContent = remaining.slice(startIdx + 2, endIdx);
    try {
      parts.push(
        <div key={`block-${key++}`} className={styles.blockMath}>
          <BlockMath math={mathContent} />
        </div>
      );
    } catch {
      parts.push(
        <div key={`block-${key++}`} className={styles.mathError}>
          수식 오류: {mathContent}
        </div>
      );
    }
    
    remaining = remaining.slice(endIdx + 2);
  }

  if (remaining) {
    parts.push(...renderInlineMath(remaining, key));
  }

  return parts;
}

function renderInlineMath(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = startKey;

  while (remaining.includes('$')) {
    const startIdx = remaining.indexOf('$');
    const endIdx = remaining.indexOf('$', startIdx + 1);
    
    if (endIdx === -1) {
      parts.push(<span key={`text-${key++}`}>{remaining}</span>);
      return parts;
    }
    
    if (startIdx > 0) {
      parts.push(<span key={`text-${key++}`}>{remaining.slice(0, startIdx)}</span>);
    }
    
    const mathContent = remaining.slice(startIdx + 1, endIdx);
    try {
      parts.push(<InlineMath key={`inline-${key++}`} math={mathContent} />);
    } catch {
      parts.push(
        <span key={`inline-${key++}`} className={styles.mathError}>
          수식 오류
        </span>
      );
    }
    
    remaining = remaining.slice(endIdx + 1);
  }

  if (remaining) {
    parts.push(<span key={`text-${key++}`}>{remaining}</span>);
  }

  return parts;
}

export default function AnswerForm({ questionId, onSuccess, onCancel }: AnswerFormProps) {
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClientSupabaseClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAdminId(user.id);
      }
    };
    getUser();
  }, [supabase]);

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

  const insertMathTemplate = (template: string) => {
    const textarea = document.getElementById('answer-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      setContent(before + template + after);
      
      // Focus and place cursor
      setTimeout(() => {
        textarea.focus();
        const cursorPos = start + template.indexOf('|');
        if (cursorPos > start) {
          textarea.selectionStart = start + template.indexOf('수식');
          textarea.selectionEnd = start + template.indexOf('수식') + 2;
        }
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('답변 내용을 입력해주세요.');
      return;
    }

    if (!adminId) {
      setError('관리자 정보를 불러올 수 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Handle image upload
      let imageUrl: string | null = null;
      let imageStoragePath: string | null = null;

      if (imageFile) {
        const { url, storagePath, error: uploadError } = await uploadQAAnswerAttachment(adminId, imageFile);
        if (uploadError) {
          throw uploadError;
        }
        imageUrl = url;
        imageStoragePath = storagePath;
      }

      // Create answer
      const { error: insertError } = await (supabase
        .from('lesson_answers') as any)
        .insert({
          question_id: questionId,
          admin_id: adminId,
          content: content.trim(),
          video_url: videoUrl.trim() || null,
          image_url: imageUrl,
          image_storage_path: imageStoragePath,
        });

      if (insertError) {
        throw insertError;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error saving answer:', err);
      setError(err.message || '답변 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.answerForm}>
      <h4>답변 작성</h4>

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label}>
          답변 내용 *
          <span className={styles.labelHint}>수식: $인라인$ 또는 $$블록$$</span>
        </label>
        
        <div className={styles.mathToolbar}>
          <button
            type="button"
            className={styles.mathButton}
            onClick={() => insertMathTemplate('$수식$')}
            title="인라인 수식"
          >
            <FaCalculator /> 인라인 수식
          </button>
          <button
            type="button"
            className={styles.mathButton}
            onClick={() => insertMathTemplate('\n$$\n수식\n$$\n')}
            title="블록 수식"
          >
            <FaCalculator /> 블록 수식
          </button>
          <button
            type="button"
            className={styles.mathButton}
            onClick={() => insertMathTemplate('\\frac{분자}{분모}')}
            title="분수"
          >
            분수
          </button>
          <button
            type="button"
            className={styles.mathButton}
            onClick={() => insertMathTemplate('\\sqrt{}')}
            title="루트"
          >
            √
          </button>
          <button
            type="button"
            className={styles.mathButton}
            onClick={() => insertMathTemplate('^{}')}
            title="지수"
          >
            x²
          </button>
          <button
            type="button"
            className={styles.mathButton}
            onClick={() => insertMathTemplate('\\sum_{i=1}^{n}')}
            title="시그마"
          >
            Σ
          </button>
          <button
            type="button"
            className={styles.mathButton}
            onClick={() => insertMathTemplate('\\int_{a}^{b}')}
            title="적분"
          >
            ∫
          </button>
        </div>

        <textarea
          id="answer-content"
          className={styles.textarea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="답변 내용을 입력하세요. 수식은 $x^2 + y^2 = r^2$ 형식으로 작성합니다."
          rows={6}
          disabled={loading}
        />

        <button
          type="button"
          className={styles.previewButton}
          onClick={() => setShowPreview(!showPreview)}
        >
          <FaEye /> {showPreview ? '미리보기 닫기' : '미리보기'}
        </button>

        {showPreview && content && (
          <div className={styles.preview}>
            <h5>미리보기</h5>
            <div className={styles.previewContent}>
              {renderPreview(content)}
            </div>
          </div>
        )}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <FaVideo className={styles.labelIcon} />
          동영상 URL (선택)
        </label>
        <input
          type="url"
          className={styles.input}
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="YouTube 또는 Vimeo URL"
          disabled={loading}
        />
        <span className={styles.helpText}>YouTube, Vimeo 링크를 입력하면 자동으로 임베드됩니다.</span>
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
          답변 등록
        </Button>
      </div>
    </form>
  );
}
