'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { uploadLessonResource, validateResourceFile, STORAGE_BUCKETS } from '@/lib/storage';
import { FaTimes, FaTrash, FaSpinner, FaCloudUploadAlt, FaImages, FaSave } from 'react-icons/fa';
import { useModal } from '@/components/Modal';
import styles from './LessonImageModal.module.css';

interface Resource {
  type: 'link' | 'pdf' | 'file' | 'image';
  title: string;
  url: string;
  storage_path?: string;
  caption?: string;
}

interface LessonImageModalProps {
  lessonId: string;
  lessonTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function LessonImageModal({
  lessonId,
  lessonTitle,
  isOpen,
  onClose,
}: LessonImageModalProps) {
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  // 캡션 임시 편집 상태 (allResources 인덱스 기준)
  const [captionDrafts, setCaptionDrafts] = useState<Record<number, string>>({});

  // 자료 불러오기 (전체 — 저장 시 비이미지 보존)
  useEffect(() => {
    if (!isOpen || !lessonId) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lessons')
        .select('resources')
        .eq('id', lessonId)
        .single();
      setIsLoading(false);
      if (error) {
        console.error('Error fetching resources:', error);
        return;
      }
      setAllResources((data?.resources || []) as Resource[]);
      setCaptionDrafts({});
    };
    fetch();
  }, [lessonId, isOpen, supabase]);

  const saveResources = async (next: Resource[]) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ resources: next, updated_at: new Date().toISOString() })
        .eq('id', lessonId);
      if (error) throw error;
      setAllResources(next);
      return true;
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '저장 중 오류가 발생했습니다.', type: 'error' });
      return false;
    }
  };

  const processFiles = useCallback(
    async (files: FileList) => {
      if (files.length === 0) return;

      const invalid: string[] = [];
      const valid: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const v = validateResourceFile(f);
        if (!v.valid) invalid.push(`${f.name}: ${v.error}`);
        else valid.push(f);
      }
      if (invalid.length > 0) {
        alert({
          title: '일부 파일 업로드 불가',
          message: `다음 파일들은 업로드할 수 없습니다:\n${invalid.join('\n')}`,
          type: 'warning',
        });
      }
      if (valid.length === 0) return;

      setIsUploading(true);
      setUploadProgress({ current: 0, total: valid.length });

      const uploaded: Resource[] = [];
      const failed: string[] = [];

      for (let i = 0; i < valid.length; i++) {
        const f = valid[i];
        setUploadProgress({ current: i + 1, total: valid.length });
        try {
          const { url, storagePath, error } = await uploadLessonResource(lessonId, f);
          if (error || !url || !storagePath) throw error || new Error('업로드 실패');
          uploaded.push({
            type: 'image',
            title: f.name,
            url,
            storage_path: storagePath,
            caption: '',
          });
        } catch (err: any) {
          failed.push(f.name);
          console.error(`이미지 업로드 실패: ${f.name}`, err);
        }
      }

      if (uploaded.length > 0) {
        await saveResources([...allResources, ...uploaded]);
      }
      if (failed.length > 0) {
        alert({
          title: '일부 업로드 실패',
          message: `다음 파일들의 업로드에 실패했습니다:\n${failed.join('\n')}`,
          type: 'error',
        });
      } else if (uploaded.length > 1) {
        alert({
          title: '업로드 완료',
          message: `${uploaded.length}개의 이미지가 업로드되었습니다.`,
          type: 'success',
        });
      }

      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [allResources, lessonId]
  );

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) processFiles(files);
    },
    [processFiles]
  );

  const handleCaptionChange = (absIndex: number, value: string) => {
    setCaptionDrafts((p) => ({ ...p, [absIndex]: value }));
  };

  const handleSaveCaption = async (absIndex: number) => {
    const draft = captionDrafts[absIndex];
    if (draft === undefined) return;
    const next = allResources.map((r, i) => (i === absIndex ? { ...r, caption: draft } : r));
    const ok = await saveResources(next);
    if (ok) {
      setCaptionDrafts((p) => {
        const n = { ...p };
        delete n[absIndex];
        return n;
      });
    }
  };

  const handleDelete = async (absIndex: number) => {
    const target = allResources[absIndex];
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `"${target.caption || target.title}" 이미지를 삭제하시겠습니까?`,
        type: 'warning',
      }))
    ) {
      return;
    }
    if (target.storage_path) {
      try {
        await supabase.storage
          .from(STORAGE_BUCKETS.LESSON_RESOURCES)
          .remove([target.storage_path]);
      } catch (err) {
        console.error('Storage 삭제 실패:', err);
      }
    }
    const next = allResources.filter((_, i) => i !== absIndex);
    await saveResources(next);
    setCaptionDrafts((p) => {
      const n = { ...p };
      delete n[absIndex];
      return n;
    });
  };

  // 이미지만 표시 — 단, absIndex(allResources 내 위치)를 유지해야 캡션 저장이 정확히 적용됨
  const imageEntries = allResources
    .map((r, idx) => ({ r, idx }))
    .filter(({ r }) => r.type === 'image');

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${isDragOver ? styles.dragOver : ''}`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className={styles.dropOverlay}>
            <FaCloudUploadAlt className={styles.dropIcon} />
            <p>이미지를 여기에 놓으세요</p>
          </div>
        )}

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>
              <FaImages /> 이미지 관리
            </h2>
            <p className={styles.subtitle}>{lessonTitle}</p>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>
              <FaSpinner className={styles.spinner} />
              <span>불러오는 중...</span>
            </div>
          ) : (
            <>
              <div
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
              >
                <FaCloudUploadAlt className={styles.dropZoneIcon} />
                <p className={styles.dropZoneText}>
                  이미지를 드래그하여 놓거나 <strong>클릭</strong>하여 업로드
                </p>
                <p className={styles.dropZoneHint}>JPEG, PNG, WebP, GIF (각 최대 300MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                />
              </div>

              {isUploading && (
                <div className={styles.uploadProgress}>
                  <FaSpinner className={styles.spinner} />
                  <span>
                    업로드 중...
                    {uploadProgress.total > 1 &&
                      ` (${uploadProgress.current}/${uploadProgress.total})`}
                  </span>
                </div>
              )}

              <div className={styles.listHeader}>
                <span>등록된 이미지 ({imageEntries.length})</span>
                {imageEntries.length > 0 && (
                  <span className={styles.listHint}>
                    캡션은 학생 페이지 영상 아래에 함께 표시됩니다.
                  </span>
                )}
              </div>

              {imageEntries.length === 0 ? (
                <div className={styles.emptyState}>등록된 이미지가 없습니다.</div>
              ) : (
                <div className={styles.imageGrid}>
                  {imageEntries.map(({ r, idx }) => {
                    const draft = captionDrafts[idx];
                    const value = draft !== undefined ? draft : r.caption || '';
                    const isDirty = draft !== undefined && draft !== (r.caption || '');
                    return (
                      <div key={idx} className={styles.imageCard}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.thumbWrap}
                          title="원본 보기"
                        >
                          <img src={r.url} alt={r.title} className={styles.thumb} />
                        </a>
                        <div className={styles.cardBody}>
                          <span className={styles.fileName} title={r.title}>
                            {r.title}
                          </span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleCaptionChange(idx, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && isDirty) handleSaveCaption(idx);
                            }}
                            placeholder="캡션 (예: 2-15-(7) 정정 풀이)"
                            className={styles.captionInput}
                          />
                          <div className={styles.cardActions}>
                            {isDirty && (
                              <button
                                type="button"
                                className={`${styles.iconBtn} ${styles.saveBtn}`}
                                onClick={() => handleSaveCaption(idx)}
                                title="캡션 저장"
                              >
                                <FaSave />
                              </button>
                            )}
                            <button
                              type="button"
                              className={`${styles.iconBtn} ${styles.deleteBtn}`}
                              onClick={() => handleDelete(idx)}
                              title="삭제"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
