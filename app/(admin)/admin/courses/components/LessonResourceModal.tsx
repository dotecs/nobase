'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { uploadLessonResource, validateResourceFile, STORAGE_BUCKETS } from '@/lib/storage';
import { FaTimes, FaUpload, FaTrash, FaFilePdf, FaFileAlt, FaLink, FaExternalLinkAlt, FaSpinner } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import styles from './LessonResourceModal.module.css';

interface Resource {
  type: 'link' | 'pdf' | 'file';
  title: string;
  url: string;
  storage_path?: string; // Supabase Storage 경로
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

  // 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 유효성 검사
    const validation = validateResourceFile(file);
    if (!validation.valid) {
      alert({ title: '업로드 오류', message: validation.error || '파일 업로드에 실패했습니다.', type: 'error' });
      return;
    }

    setIsUploading(true);

    try {
      const { url, storagePath, error } = await uploadLessonResource(lessonId, file);
      
      if (error || !url || !storagePath) {
        throw error || new Error('업로드 실패');
      }
      
      // 파일 타입 결정
      const fileType: Resource['type'] = file.type === 'application/pdf' ? 'pdf' : 'file';
      
      const newResource: Resource = {
        type: fileType,
        title: file.name,
        url: url,
        storage_path: storagePath,
      };

      const newResources = [...resources, newResource];
      await saveResources(newResources);

    } catch (err: any) {
      alert({ title: '업로드 오류', message: err.message || '파일 업로드에 실패했습니다.', type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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
      default:
        return <FaFileAlt />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
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
              {/* 자료 목록 */}
              <div className={styles.resourceList}>
                {resources.length === 0 ? (
                  <div className={styles.emptyState}>
                    등록된 학습 자료가 없습니다.
                  </div>
                ) : (
                  resources.map((resource, index) => (
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
                  ))
                )}
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

              {/* 액션 버튼들 */}
              <div className={styles.actions}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  accept=".pdf,.zip,.txt,.xlsx,.docx,.pptx,.jpg,.jpeg,.png,.webp,.gif"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <FaSpinner className={styles.spinner} /> 업로드 중...
                    </>
                  ) : (
                    <>
                      <FaUpload /> 파일 업로드
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowLinkForm(true)}
                  disabled={showLinkForm}
                >
                  <FaLink /> 링크 추가
                </Button>
              </div>

              <p className={styles.hint}>
                지원 형식: PDF, ZIP, TXT, XLSX, DOCX, PPTX, 이미지 (최대 50MB)
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
