'use client';

import { useState } from 'react';
import { FaTimes, FaCheck, FaPlus } from 'react-icons/fa';
import { Button } from '@/components';
import styles from './SubjectLessonModal.module.css';

interface Lesson {
  id: string;
  title: string;
  sort_order: number;
  subject_id: string | null;
}

interface SubjectLessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  subjectTitle: string;
  lessons: Lesson[];
  onAssignLessons: (lessonIds: string[]) => Promise<void>;
}

export default function SubjectLessonModal({
  isOpen,
  onClose,
  subjectId,
  subjectTitle,
  lessons,
  onAssignLessons,
}: SubjectLessonModalProps) {
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // 미분류 강의 (다른 과목에 속하지 않은 강의)
  const unassignedLessons = lessons.filter(l => l.subject_id === null);
  // 다른 과목에 속한 강의
  const otherSubjectLessons = lessons.filter(l => l.subject_id !== null && l.subject_id !== subjectId);

  if (!isOpen) return null;

  const handleToggleLesson = (lessonId: string) => {
    setSelectedLessonIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (lessonList: Lesson[]) => {
    setSelectedLessonIds(prev => {
      const newSet = new Set(prev);
      lessonList.forEach(l => newSet.add(l.id));
      return newSet;
    });
  };

  const handleDeselectAll = () => {
    setSelectedLessonIds(new Set());
  };

  const handleAssign = async () => {
    if (selectedLessonIds.size === 0) return;
    
    setIsLoading(true);
    try {
      await onAssignLessons(Array.from(selectedLessonIds));
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.subjectName}>{subjectTitle}</span>에 강의 배정
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className={styles.content}>
          {unassignedLessons.length === 0 && otherSubjectLessons.length === 0 ? (
            <div className={styles.emptyState}>
              <p>배정할 수 있는 강의가 없습니다.</p>
              <p className={styles.emptyHint}>먼저 레슨을 추가하세요.</p>
            </div>
          ) : (
            <>
              {/* 미분류 강의 섹션 */}
              {unassignedLessons.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>미분류 강의</h3>
                    <button 
                      className={styles.selectAllBtn}
                      onClick={() => handleSelectAll(unassignedLessons)}
                    >
                      전체 선택
                    </button>
                  </div>
                  <div className={styles.lessonList}>
                    {unassignedLessons.map(lesson => (
                      <label 
                        key={lesson.id} 
                        className={`${styles.lessonItem} ${selectedLessonIds.has(lesson.id) ? styles.selected : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLessonIds.has(lesson.id)}
                          onChange={() => handleToggleLesson(lesson.id)}
                          className={styles.checkbox}
                        />
                        <span className={styles.lessonOrder}>{lesson.sort_order}</span>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                        {selectedLessonIds.has(lesson.id) && (
                          <FaCheck className={styles.checkIcon} />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* 다른 과목 강의 섹션 */}
              {otherSubjectLessons.length > 0 && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>다른 과목에 배정된 강의</h3>
                    <span className={styles.sectionHint}>이동됩니다</span>
                  </div>
                  <div className={styles.lessonList}>
                    {otherSubjectLessons.map(lesson => (
                      <label 
                        key={lesson.id} 
                        className={`${styles.lessonItem} ${styles.otherSubject} ${selectedLessonIds.has(lesson.id) ? styles.selected : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLessonIds.has(lesson.id)}
                          onChange={() => handleToggleLesson(lesson.id)}
                          className={styles.checkbox}
                        />
                        <span className={styles.lessonOrder}>{lesson.sort_order}</span>
                        <span className={styles.lessonTitle}>{lesson.title}</span>
                        {selectedLessonIds.has(lesson.id) && (
                          <FaCheck className={styles.checkIcon} />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.selectedCount}>
            {selectedLessonIds.size > 0 && (
              <>
                <span>{selectedLessonIds.size}개 선택됨</span>
                <button className={styles.clearBtn} onClick={handleDeselectAll}>
                  선택 해제
                </button>
              </>
            )}
          </div>
          <div className={styles.footerActions}>
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={selectedLessonIds.size === 0}
              loading={isLoading}
            >
              <FaPlus /> {selectedLessonIds.size}개 강의 배정
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
