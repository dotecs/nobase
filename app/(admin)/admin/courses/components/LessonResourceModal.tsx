'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { uploadLessonResource, validateResourceFile, STORAGE_BUCKETS } from '@/lib/storage';
import { FaTimes, FaTrash, FaFilePdf, FaFileAlt, FaLink, FaExternalLinkAlt, FaSpinner, FaCloudUploadAlt, FaImage, FaSave } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import styles from './LessonResourceModal.module.css';

interface Resource {
  type: 'link' | 'pdf' | 'file' | 'image';
  title: string;
  url: string;
  storage_path?: string; // Supabase Storage 경로
  caption?: string; // image 타입 캡션
}

interface LessonResourceModalProps {
  lessonId: string;
  lessonTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function LessonResourceModal({ 
  lessonId, 
  lessonTitle, 
  isOpen, 
  onClose 
}: LessonResourceModalProps) {
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // 새 링크 추가용 상태
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [showLinkForm, setShowLinkForm] = useState(false);

  // 자료 목록 불러오기
  useEffect(() => {
    const fetchResources = async () => {
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

      setResources((data?.resources || []) as Resource[]);
    };

    if (isOpen) {
      fetchResources();
    }
  }, [lessonId, isOpen, supabase]);

  // 자료 목록 저장
  const saveResources = async (newResources: Resource[]) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ 
          resources: newResources,
          updated_at: new Date().toISOString()
        })
        .eq('id', lessonId);

      if (error) throw error;
      setResources(newResources);
      return true;
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '저장 중 오류가 발생했습니다.', type: 'error' });
      return false;
    }
  };

  // 업로드 진행 상태
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // 드래그앤드롭 핸들러
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
    if (files && files.length > 0) {
      processFiles(files);
    }
  }, []);

  // 파일 처리 (파일 입력 및 드래그앤드롭 공통)
  const processFiles = async (files: FileList) => {
    if (files.length === 0) return;

    // 모든 파일 유효성 검사
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateResourceFile(file);
      if (!validation.valid) {
        invalidFiles.push(`${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (invalidFiles.length > 0) {
      alert({ 
        title: '일부 파일 업로드 불가', 
        message: `다음 파일들은 업로드할 수 없습니다:\n${invalidFiles.join('\n')}`, 
        type: 'warning' 
      });
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validFiles.length });

    const uploadedResources: Resource[] = [];
    const failedFiles: string[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadProgress({ current: i + 1, total: validFiles.length });

      try {
        const { url, storagePath, error } = await uploadLessonResource(lessonId, file);
        
        if (error || !url || !storagePath) {
          throw error || new Error('업로드 실패');
        }
        
        // 파일 타입 결정
        const isImage = file.type.startsWith('image/');
        const fileType: Resource['type'] = isImage
          ? 'image'
          : file.type === 'application/pdf'
          ? 'pdf'
          : 'file';

        uploadedResources.push({
          type: fileType,
          title: file.name,
          url: url,
          storage_path: storagePath,
          ...(isImage ? { caption: '' } : {}),
        });
      } catch (err: any) {
        failedFiles.push(file.name);
        console.error(`파일 업로드 실패: ${file.name}`, err);
      }
    }

    // 성공한 파일들 저장
    if (uploadedResources.length > 0) {
      const newResources = [...resources, ...uploadedResources];
      await saveResources(newResources);
    }

    // 실패한 파일이 있으면 알림
    if (failedFiles.length > 0) {
      alert({ 
        title: '일부 업로드 실패', 
        message: `다음 파일들의 업로드에 실패했습니다:\n${failedFiles.join('\n')}`, 
        type: 'error' 
      });
    } else if (uploadedResources.length > 0) {
      // 모든 파일 업로드 성공 시 (여러 파일인 경우만 알림)
      if (uploadedResources.length > 1) {
        alert({ 
          title: '업로드 완료', 
          message: `${uploadedResources.length}개의 파일이 성공적으로 업로드되었습니다.`, 
          type: 'success' 
        });
      }
    }

    setIsUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 파일 업로드 (input 이벤트)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  // 링크 추가
  const handleAddLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) {
      alert({ title: '입력 오류', message: '제목과 URL을 모두 입력해주세요.', type: 'warning' });
      return;
    }

    // URL 형식 검증
    let url = newLink.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const newResource: Resource = {
      type: 'link',
      title: newLink.title.trim(),
      url: url,
    };

    const newResources = [...resources, newResource];
    const success = await saveResources(newResources);
    
    if (success) {
      setNewLink({ title: '', url: '' });
      setShowLinkForm(false);
    }
  };

  // 자료 삭제
  const handleDeleteResource = async (index: number) => {
    const resource = resources[index];
    
    if (!await confirm({ 
      title: '삭제 확인', 
      message: `"${resource.title}" 자료를 삭제하시겠습니까?`, 
      type: 'warning' 
    })) {
      return;
    }

    // Storage에서 파일 삭제 (storage_path가 있는 경우)
    if (resource.storage_path) {
      try {
        await supabase.storage
          .from(STORAGE_BUCKETS.LESSON_RESOURCES)
          .remove([resource.storage_path]);
      } catch (err) {
        console.error('Storage 삭제 실패:', err);
      }
    }

    const newResources = resources.filter((_, i) => i !== index);
    await saveResources(newResources);
  };

  // 아이콘 선택
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

  // 캡션 편집 상태 (이미지 전용)
  const [captionDrafts, setCaptionDrafts] = useState<Record<number, string>>({});

  const handleCaptionChange = (index: number, value: string) => {
    setCaptionDrafts((prev) => ({ ...prev, [index]: value }));
  };

  const handleSaveCaption = async (index: number) => {
    const draft = captionDrafts[index];
    if (draft === undefined) return;
    const newResources = resources.map((r, i) => (i === index ? { ...r, caption: draft } : r));
    const success = await saveResources(newResources);
    if (success) {
      setCaptionDrafts((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
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
        {/* 드래그 오버레이 */}
        {isDragOver && (
          <div className={styles.dropOverlay}>
            <FaCloudUploadAlt className={styles.dropIcon} />
            <p>파일을 여기에 놓으세요</p>
          </div>
        )}
        
        <div className={styles.header}>
          <h2 className={styles.title}>학습 자료 관리</h2>
          <p className={styles.subtitle}>{lessonTitle}</p>
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
              {/* 드래그앤드롭 업로드 영역 */}
              <div 
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
              >
                <FaCloudUploadAlt className={styles.dropZoneIcon} />
                <p className={styles.dropZoneText}>
                  파일을 드래그하여 놓거나 <strong>클릭</strong>하여 업로드
                </p>
                <p className={styles.dropZoneHint}>
                  PDF, ZIP, DOCX, XLSX, 이미지 등 (최대 50MB)
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

              {/* 업로드 진행 상태 */}
              {isUploading && (
                <div className={styles.uploadProgress}>
                  <FaSpinner className={styles.spinner} />
                  <span>업로드 중... {uploadProgress.total > 1 && `(${uploadProgress.current}/${uploadProgress.total})`}</span>
                </div>
              )}

              {/* 자료 목록 */}
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

                {/* 링크 추가 폼 */}
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
                      <Button size="sm" onClick={handleAddLink}>추가</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowLinkForm(false);
                        setNewLink({ title: '', url: '' });
                      }}>취소</Button>
                    </div>
                  </div>
                )}

                {resources.length === 0 ? (
                  <div className={styles.emptyState}>
                    등록된 학습 자료가 없습니다.
                  </div>
                ) : (
                  resources.map((resource, index) => {
                    if (resource.type === 'image') {
                      const draft = captionDrafts[index];
                      const currentCaption = draft !== undefined ? draft : (resource.caption || '');
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
                              placeholder="학생 페이지에 표시될 캡션 (예: 2-15-(7) 정정 풀이)"
                              className={styles.captionInput}
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
                        <span className={styles.resourceIcon}>
                          {getResourceIcon(resource.type)}
                        </span>
                        <div className={styles.resourceInfo}>
                          <span className={styles.resourceTitle}>{resource.title}</span>
                          <span className={styles.resourceType}>
                            {resource.type === 'link' ? '링크' : resource.type === 'pdf' ? 'PDF' : '파일'}
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
