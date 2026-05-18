'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { uploadSubjectResource, validateResourceFile, STORAGE_BUCKETS } from '@/lib/storage';
import {
  FaTimes,
  FaTrash,
  FaFilePdf,
  FaFileAlt,
  FaLink,
  FaExternalLinkAlt,
  FaSpinner,
  FaCloudUploadAlt,
  FaImage,
  FaSave,
  FaFolder,
} from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import styles from './LessonResourceModal.module.css';

interface Resource {
  type: 'link' | 'pdf' | 'file' | 'image';
  title: string;
  url: string;
  storage_path?: string;
  caption?: string;
}

interface SubjectResourceModalProps {
  subjectId: string;
  subjectTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SubjectResourceModal({
  subjectId,
  subjectTitle,
  isOpen,
  onClose,
}: SubjectResourceModalProps) {
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [captionDrafts, setCaptionDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const fetchResources = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('resources')
        .eq('id', subjectId)
        .single();
      setIsLoading(false);
      if (error) {
        console.error('Error fetching subject resources:', {
          message: (error as any)?.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
          raw: error,
        });
        return;
      }
      setResources((data?.resources || []) as Resource[]);
      setCaptionDrafts({});
    };
    fetchResources();
  }, [subjectId, isOpen, supabase]);

  const saveResources = async (next: Resource[]) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ resources: next, updated_at: new Date().toISOString() })
        .eq('id', subjectId);
      if (error) throw error;
      setResources(next);
      return true;
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '저장 중 오류가 발생했습니다.', type: 'error' });
      return false;
    }
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) processFiles(files);
  }, []);

  const processFiles = async (files: FileList) => {
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
        const { url, storagePath, error } = await uploadSubjectResource(subjectId, f);
        if (error || !url || !storagePath) throw error || new Error('업로드 실패');
        const isImage = f.type.startsWith('image/');
        const fileType: Resource['type'] = isImage
          ? 'image'
          : f.type === 'application/pdf'
          ? 'pdf'
          : 'file';
        uploaded.push({
          type: fileType,
          title: f.name,
          url,
          storage_path: storagePath,
          ...(isImage ? { caption: '' } : {}),
        });
      } catch (err: any) {
        failed.push(f.name);
        console.error(`업로드 실패: ${f.name}`, err);
      }
    }

    if (uploaded.length > 0) {
      await saveResources([...resources, ...uploaded]);
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
        message: `${uploaded.length}개의 파일이 업로드되었습니다.`,
        type: 'success',
      });
    }

    setIsUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const handleAddLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) {
      alert({ title: '입력 오류', message: '제목과 URL을 모두 입력해주세요.', type: 'warning' });
      return;
    }
    let url = newLink.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const newResource: Resource = { type: 'link', title: newLink.title.trim(), url };
    const ok = await saveResources([...resources, newResource]);
    if (ok) {
      setNewLink({ title: '', url: '' });
      setShowLinkForm(false);
    }
  };

  const handleDeleteResource = async (index: number) => {
    const r = resources[index];
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `"${r.title}" 자료를 삭제하시겠습니까?`,
        type: 'warning',
      }))
    ) {
      return;
    }
    if (r.storage_path) {
      try {
        await supabase.storage.from(STORAGE_BUCKETS.LESSON_RESOURCES).remove([r.storage_path]);
      } catch (err) {
        console.error('Storage 삭제 실패:', err);
      }
    }
    await saveResources(resources.filter((_, i) => i !== index));
    setCaptionDrafts((p) => {
      const n = { ...p };
      delete n[index];
      return n;
    });
  };

  const handleCaptionChange = (index: number, value: string) => {
    setCaptionDrafts((p) => ({ ...p, [index]: value }));
  };

  const handleSaveCaption = async (index: number) => {
    const draft = captionDrafts[index];
    if (draft === undefined) return;
    const next = resources.map((r, i) => (i === index ? { ...r, caption: draft } : r));
    const ok = await saveResources(next);
    if (ok) {
      setCaptionDrafts((p) => {
        const n = { ...p };
        delete n[index];
        return n;
      });
    }
  };

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'pdf':
        return <FaFilePdf />;
      case 'link':
        return <FaExternalLinkAlt />;
      case 'image':
        return <FaImage />;
      default:
        return <FaFileAlt />;
    }
  };

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
            <p>파일을 여기에 놓으세요</p>
          </div>
        )}

        <div className={styles.header}>
          <h2 className={styles.title}>
            <FaFolder style={{ marginRight: 8 }} />과목 공통 자료
          </h2>
          <p className={styles.subtitle}>
            {subjectTitle} — 이 과목에 속한 모든 강의에 자동으로 노출됩니다.
          </p>
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
              <div className={styles.dropZone} onClick={() => fileInputRef.current?.click()}>
                <FaCloudUploadAlt className={styles.dropZoneIcon} />
                <p className={styles.dropZoneText}>
                  파일을 드래그하여 놓거나 <strong>클릭</strong>하여 업로드
                </p>
                <p className={styles.dropZoneHint}>
                  PDF, ZIP, DOCX, XLSX, 이미지 등 (최대 300MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept=".pdf,.zip,.txt,.xlsx,.docx,.pptx,.jpg,.jpeg,.png,.webp,.gif"
                  multiple
                />
              </div>

              {isUploading && (
                <div className={styles.uploadProgress}>
                  <FaSpinner className={styles.spinner} />
                  <span>
                    업로드 중...
                    {uploadProgress.total > 1 && ` (${uploadProgress.current}/${uploadProgress.total})`}
                  </span>
                </div>
              )}

              <div className={styles.resourceList}>
                <div className={styles.resourceListHeader}>
                  <span>등록된 자료 ({resources.length})</span>
                  <button
                    className={styles.addLinkButton}
                    onClick={() => setShowLinkForm(!showLinkForm)}
                  >
                    <FaLink /> 링크 추가
                  </button>
                </div>

                {showLinkForm && (
                  <div className={styles.linkForm}>
                    <input
                      type="text"
                      placeholder="자료 제목"
                      value={newLink.title}
                      onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                      className={styles.input}
                    />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      className={styles.input}
                    />
                    <div className={styles.linkFormActions}>
                      <Button size="sm" onClick={handleAddLink}>
                        추가
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowLinkForm(false);
                          setNewLink({ title: '', url: '' });
                        }}
                      >
                        취소
                      </Button>
                    </div>
                  </div>
                )}

                {resources.length === 0 ? (
                  <div className={styles.emptyState}>등록된 공통 자료가 없습니다.</div>
                ) : (
                  resources.map((resource, index) => {
                    if (resource.type === 'image') {
                      const draft = captionDrafts[index];
                      const currentCaption = draft !== undefined ? draft : resource.caption || '';
                      const isDirty = draft !== undefined && draft !== (resource.caption || '');
                      return (
                        <div key={index} className={`${styles.resourceItem} ${styles.imageItem}`}>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.imageThumbWrap}
                            title="원본 보기"
                          >
                            <img src={resource.url} alt={resource.title} className={styles.imageThumb} />
                          </a>
                          <div className={styles.imageInfo}>
                            <span className={styles.resourceTitle}>{resource.title}</span>
                            <input
                              type="text"
                              value={currentCaption}
                              onChange={(e) => handleCaptionChange(index, e.target.value)}
                              placeholder="학생 페이지에 표시될 캡션"
                              className={styles.captionInput}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isDirty) handleSaveCaption(index);
                              }}
                            />
                          </div>
                          {isDirty && (
                            <button
                              className={`${styles.iconActionBtn} ${styles.saveBtn}`}
                              onClick={() => handleSaveCaption(index)}
                              title="캡션 저장"
                            >
                              <FaSave />
                            </button>
                          )}
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDeleteResource(index)}
                            title="삭제"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div key={index} className={styles.resourceItem}>
                        <span className={styles.resourceIcon}>{getResourceIcon(resource.type)}</span>
                        <div className={styles.resourceInfo}>
                          <span className={styles.resourceTitle}>{resource.title}</span>
                          <span className={styles.resourceType}>
                            {resource.type === 'link'
                              ? '링크'
                              : resource.type === 'pdf'
                              ? 'PDF'
                              : '파일'}
                          </span>
                        </div>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.resourcePreview}
                        >
                          미리보기
                        </a>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteResource(index)}
                          title="삭제"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
