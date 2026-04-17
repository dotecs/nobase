'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import type { Lesson, Subject } from '@/lib/database.types';
import { FaPlus, FaTrash, FaSave, FaVideo, FaPaperclip, FaGripVertical, FaFolder, FaFolderOpen, FaEdit, FaLink, FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import LessonVideoModal from './LessonVideoModal';
import LessonResourceModal from './LessonResourceModal';
import SubjectLessonModal from './SubjectLessonModal';
import styles from './CurriculumManager.module.css';

interface CurriculumManagerProps {
  courseId: string;
}

interface EditingLesson extends Lesson {
  isDirty?: boolean;
}

interface EditingSubject extends Subject {
  isDirty?: boolean;
  isExpanded?: boolean;
}

export default function CurriculumManager({ courseId }: CurriculumManagerProps) {
  // Admin 페이지에서는 RLS 정책으로 인한 타입 제한을 우회
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();

  const [lessons, setLessons] = useState<EditingLesson[]>([]);
  const [subjects, setSubjects] = useState<EditingSubject[]>([]);
  const [, setIsLoading] = useState(false);
  
  // Subject 관련 State
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingSubjectTitle, setEditingSubjectTitle] = useState('');
  
  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLTableRowElement | null>(null);
  
  // Video Modal State
  const [videoModalLesson, setVideoModalLesson] = useState<{ id: string; title: string } | null>(null);
  
  // Resource Modal State
  const [resourceModalLesson, setResourceModalLesson] = useState<{ id: string; title: string } | null>(null);
  
  // Subject Lesson Assignment Modal State
  const [assignSubject, setAssignSubject] = useState<{ id: string; title: string } | null>(null);
  
  // New Lesson State
  const [newLesson, setNewLesson] = useState({
    title: '',
    is_published: true,
    is_free: false,
    available_at: '',
  });

  // Fetch Lessons and Subjects
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });

      setIsLoading(false);

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return;
      }
      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
      }

      setLessons(lessonsData || []);
      setSubjects((subjectsData || []).map(s => ({ ...s, isExpanded: false })));
    };

    fetchData();
  }, [courseId, supabase]);

  // Handle Input Change for Existing Lessons
  const handleLessonChange = (id: string, field: keyof Lesson, value: any) => {
    setLessons(prev => prev.map(lesson => {
      if (lesson.id === id) {
        return { ...lesson, [field]: value, isDirty: true };
      }
      return lesson;
    }));
  };

  // Save specific lesson
  const handleSaveLesson = async (lesson: EditingLesson) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
             title: lesson.title,
             sort_order: lesson.sort_order,
             is_published: lesson.is_published,
             is_free: lesson.is_free,
             available_at: lesson.available_at || null,
             updated_at: new Date().toISOString(),
        })
        .eq('id', lesson.id);

      if (error) throw error;

      // Reset dirty state
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, isDirty: false } : l));
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '저장 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  // Subject CRUD Functions
  const handleAddSubject = async () => {
    if (!newSubjectTitle.trim()) {
      alert({ title: '알림', message: '과목명을 입력해주세요.', type: 'warning' });
      return;
    }

    try {
      const maxSortOrder = subjects.length > 0 ? Math.max(...subjects.map(s => s.sort_order)) : 0;
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          course_id: courseId,
          title: newSubjectTitle.trim(),
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setSubjects(prev => [...prev, { ...data, isExpanded: false }]);
      setNewSubjectTitle('');
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '과목 추가 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleUpdateSubject = async (subjectId: string) => {
    if (!editingSubjectTitle.trim()) {
      alert({ title: '알림', message: '과목명을 입력해주세요.', type: 'warning' });
      return;
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .update({ title: editingSubjectTitle.trim() })
        .eq('id', subjectId);

      if (error) throw error;

      setSubjects(prev => prev.map(s => 
        s.id === subjectId ? { ...s, title: editingSubjectTitle.trim() } : s
      ));
      setEditingSubjectId(null);
      setEditingSubjectTitle('');
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '과목 수정 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const subjectLessons = lessons.filter(l => l.subject_id === subjectId);
    if (subjectLessons.length > 0) {
      const confirmed = await confirm({
        title: '과목 삭제',
        message: `이 과목에 ${subjectLessons.length}개의 수업이 연결되어 있습니다. 삭제하면 해당 수업들의 과목 연결이 해제됩니다. 계속하시겠습니까?`,
        type: 'warning',
      });
      if (!confirmed) return;
    }

    try {
      // First, unlink lessons from this subject
      if (subjectLessons.length > 0) {
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ subject_id: null })
          .eq('subject_id', subjectId);

        if (updateError) throw updateError;

        setLessons(prev => prev.map(l => 
          l.subject_id === subjectId ? { ...l, subject_id: null } : l
        ));
      }

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      if (error) throw error;

      setSubjects(prev => prev.filter(s => s.id !== subjectId));
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '과목 삭제 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleToggleSubjectExpand = (subjectId: string) => {
    setSubjects(prev => prev.map(s =>
      s.id === subjectId ? { ...s, isExpanded: !s.isExpanded } : s
    ));
  };

  const handleLessonSubjectChange = async (lessonId: string, subjectId: string | null) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ subject_id: subjectId })
        .eq('id', lessonId);

      if (error) throw error;

      setLessons(prev => prev.map(l =>
        l.id === lessonId ? { ...l, subject_id: subjectId } : l
      ));
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '수업 과목 변경 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  // 여러 강의를 특정 과목에 일괄 배정
  const handleAssignLessonsToSubject = async (lessonIds: string[], subjectId: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ subject_id: subjectId })
        .in('id', lessonIds);

      if (error) throw error;

      setLessons(prev => prev.map(l =>
        lessonIds.includes(l.id) ? { ...l, subject_id: subjectId } : l
      ));
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '강의 배정 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  // 과목에서 강의 제거 (미분류로 이동)
  const handleRemoveLessonFromSubject = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ subject_id: null })
        .eq('id', lessonId);

      if (error) throw error;

      setLessons(prev => prev.map(l =>
        l.id === lessonId ? { ...l, subject_id: null } : l
      ));
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '강의 제거 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    dragNode.current = e.currentTarget;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.classList.add(styles.dragging);
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      resetDragState();
      return;
    }

    // Reorder lessons
    const newLessons = [...lessons];
    const [draggedLesson] = newLessons.splice(draggedIndex, 1);
    newLessons.splice(dropIndex, 0, draggedLesson);

    // Update sort_order for all lessons
    const updatedLessons = newLessons.map((lesson, index) => ({
      ...lesson,
      sort_order: index + 1,
      isDirty: lesson.sort_order !== index + 1 ? true : lesson.isDirty
    }));

    setLessons(updatedLessons);
    resetDragState();

    // Save new order to database
    try {
      const updates = updatedLessons.map((lesson, index) => 
        supabase
          .from('lessons')
          .update({ sort_order: index + 1 })
          .eq('id', lesson.id)
      );
      
      await Promise.all(updates);
      
      // Mark all as not dirty after successful save
      setLessons(prev => prev.map(l => ({ ...l, isDirty: false })));
    } catch (err: any) {
      console.error('Error updating order:', err);
      alert({ title: '오류', message: '순서 저장 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.classList.remove(styles.dragging);
    }
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  // Add New Lesson
  const handleAddLesson = async () => {
    if (!newLesson.title.trim()) {
        alert({ title: '오류', message: '제목을 입력해주세요.', type: 'warning' });
        return;
    }

    try {
      const nextOrder = lessons.length + 1;

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          title: newLesson.title,
          sort_order: nextOrder,
          is_published: newLesson.is_published,
          is_free: newLesson.is_free,
          available_at: newLesson.available_at || null,
          resources: []
        })
        .select()
        .single();

      if (error) throw error;

      // Add to list and reset new lesson input
      setLessons(prev => [...prev, data]);
      setNewLesson({
        title: '',
        is_published: true,
        is_free: false,
        available_at: '',
      });

    } catch (err: any) {
      alert({ title: '오류', message: err.message || '추가 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({ title: '삭제 확인', message: '정말로 이 레슨을 삭제하시겠습니까?', type: 'warning' })) {
        return;
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLessons(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '삭제 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>커리큘럼 관리</h3>
        <span className={styles.dragHint}>드래그하여 순서 변경</span>
      </div>

      {/* Subject Management Section */}
      <div className={styles.subjectSection}>
        <h4 className={styles.subjectTitle}><FaFolder /> 과목 관리</h4>
        <div className={styles.subjectList}>
          {subjects.map(subject => {
            const subjectLessons = lessons.filter(l => l.subject_id === subject.id);
            
            return (
              <div key={subject.id} className={styles.subjectGroup}>
                <div className={styles.subjectItem}>
                  {editingSubjectId === subject.id ? (
                    <div className={styles.subjectEdit}>
                      <input
                        type="text"
                        value={editingSubjectTitle}
                        onChange={(e) => setEditingSubjectTitle(e.target.value)}
                        className={styles.subjectInput}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateSubject(subject.id);
                          if (e.key === 'Escape') {
                            setEditingSubjectId(null);
                            setEditingSubjectTitle('');
                          }
                        }}
                      />
                      <button 
                        className={`${styles.iconButton} ${styles.save}`}
                        onClick={() => handleUpdateSubject(subject.id)}
                        title="저장"
                      >
                        <FaSave size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        className={styles.expandButton}
                        onClick={() => handleToggleSubjectExpand(subject.id)}
                        title={subject.isExpanded ? '접기' : '펼치기'}
                      >
                        {subject.isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                      </button>
                      <span 
                        className={styles.subjectName}
                        onClick={() => handleToggleSubjectExpand(subject.id)}
                      >
                        {subject.isExpanded ? <FaFolderOpen /> : <FaFolder />}
                        {subject.title}
                        <span className={styles.subjectCount}>
                          ({subjectLessons.length})
                        </span>
                      </span>
                      <div className={styles.subjectActions}>
                        <button
                          className={`${styles.iconButton} ${styles.assign}`}
                          onClick={() => setAssignSubject({ id: subject.id, title: subject.title })}
                          title="강의 배정"
                        >
                          <FaLink size={14} />
                        </button>
                        <button
                          className={`${styles.iconButton} ${styles.edit}`}
                          onClick={() => {
                            setEditingSubjectId(subject.id);
                            setEditingSubjectTitle(subject.title);
                          }}
                          title="수정"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          className={`${styles.iconButton} ${styles.delete}`}
                          onClick={() => handleDeleteSubject(subject.id)}
                          title="삭제"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                {/* 확장 시 해당 과목의 강의 목록 표시 */}
                {subject.isExpanded && subjectLessons.length > 0 && (
                  <div className={styles.subjectLessons}>
                    {subjectLessons
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map(lesson => (
                        <div key={lesson.id} className={styles.subjectLessonItem}>
                          <span className={styles.subjectLessonOrder}>{lesson.sort_order}</span>
                          <span className={styles.subjectLessonTitle}>{lesson.title}</span>
                          <button
                            className={styles.removeLessonBtn}
                            onClick={() => handleRemoveLessonFromSubject(lesson.id)}
                            title="과목에서 제거"
                          >
                            <FaTimes size={12} />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className={styles.addSubject}>
            <input
              type="text"
              value={newSubjectTitle}
              onChange={(e) => setNewSubjectTitle(e.target.value)}
              placeholder="새 과목 추가..."
              className={styles.subjectInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubject();
              }}
            />
            <Button size="sm" onClick={handleAddSubject} disabled={!newSubjectTitle.trim()}>
              <FaPlus /> 추가
            </Button>
          </div>
        </div>
      </div>

      {/* Lesson Table */}
      <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '50px' }}></th>
                        <th style={{ width: '60px' }}>순서</th>
                        <th style={{ minWidth: '220px' }}>제목</th>
                        <th style={{ width: '140px', textAlign: 'center' }}>과목</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>영상</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>자료</th>
                        <th style={{ width: '70px', textAlign: 'center' }}>무료</th>
                        <th style={{ width: '70px', textAlign: 'center' }}>공개</th>
                        <th style={{ width: '160px', textAlign: 'center' }}>공개일</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Existing Lessons */}
                    {lessons.map((lesson, index) => (
                        <tr 
                            key={lesson.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={dragOverIndex === index ? styles.dragOver : ''}
                        >
                            <td>
                                <div className={styles.dragHandle}>
                                    <FaGripVertical />
                                </div>
                            </td>
                            <td className={styles.orderCell}>
                                {lesson.sort_order}
                            </td>
                            <td>
                                <input 
                                    type="text"
                                    className={styles.tableInput}
                                    value={lesson.title}
                                    onChange={(e) => handleLessonChange(lesson.id, 'title', e.target.value)}
                                    placeholder="레슨 제목"
                                />
                            </td>
                            <td>
                                <select
                                    className={styles.tableSelect}
                                    value={lesson.subject_id || ''}
                                    onChange={(e) => handleLessonSubjectChange(lesson.id, e.target.value || null)}
                                >
                                    <option value="">미분류</option>
                                    {subjects.map(subject => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.title}
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <div className={styles.checkboxCenter}>
                                    <button 
                                        className={styles.videoButton}
                                        onClick={() => setVideoModalLesson({ id: lesson.id, title: lesson.title })}
                                        title="영상 관리"
                                    >
                                        <FaVideo /> 관리
                                    </button>
                                </div>
                            </td>
                            <td>
                                <div className={styles.checkboxCenter}>
                                    <button 
                                        className={styles.videoButton}
                                        onClick={() => setResourceModalLesson({ id: lesson.id, title: lesson.title })}
                                        title="학습 자료 관리"
                                    >
                                        <FaPaperclip /> {(lesson.resources as any[])?.length || 0}
                                    </button>
                                </div>
                            </td>
                            <td>
                                <div className={styles.checkboxCenter}>
                                    <input 
                                        type="checkbox"
                                        checked={lesson.is_free}
                                        onChange={(e) => handleLessonChange(lesson.id, 'is_free', e.target.checked)}
                                        style={{ width: '16px', height: '16px' }}
                                        title="무료 공개"
                                    />
                                </div>
                            </td>
                            <td>
                                <div className={styles.checkboxCenter}>
                                    <input 
                                        type="checkbox"
                                        checked={lesson.is_published}
                                        onChange={(e) => handleLessonChange(lesson.id, 'is_published', e.target.checked)}
                                        style={{ width: '16px', height: '16px' }}
                                        title="공개 여부"
                                    />
                                </div>
                            </td>
                            <td>
                                <input 
                                    type="datetime-local"
                                    className={styles.tableInput}
                                    value={lesson.available_at ? lesson.available_at.slice(0, 16) : ''}
                                    onChange={(e) => handleLessonChange(lesson.id, 'available_at', e.target.value || null)}
                                    title="공개 예정일 (비워두면 즉시 공개)"
                                />
                            </td>
                            <td>
                                <div className={styles.actions}>
                                    {lesson.isDirty && (
                                        <button 
                                            className={`${styles.iconButton} ${styles.save}`} 
                                            onClick={() => handleSaveLesson(lesson)}
                                            title="변경사항 저장"
                                        >
                                            <FaSave size={16} />
                                        </button>
                                    )}
                                    <button 
                                        className={`${styles.iconButton} ${styles.delete}`} 
                                        onClick={() => handleDelete(lesson.id)}
                                        title="삭제"
                                    >
                                        <FaTrash size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    
                    {/* New Lesson Row */}
                    <tr className={styles.newRow}>
                        <td></td>
                        <td className={styles.orderCell}>
                            {lessons.length + 1}
                        </td>
                        <td>
                            <input 
                                type="text"
                                className={styles.titleInput}
                                value={newLesson.title}
                                onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                                placeholder="새 강의 제목을 입력하세요"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddLesson();
                                }}
                            />
                        </td>
                        <td>
                            {/* 새 레슨은 저장 후 과목 지정 */}
                        </td>
                        <td>
                            {/* 새 레슨은 저장 후 영상 추가 */}
                        </td>
                        <td>
                            {/* 새 레슨은 저장 후 자료 추가 */}
                        </td>
                        <td>
                            <div className={styles.checkboxCenter}>
                                <input 
                                    type="checkbox"
                                    checked={newLesson.is_free}
                                    onChange={(e) => setNewLesson({...newLesson, is_free: e.target.checked})}
                                    style={{ width: '16px', height: '16px' }}
                                    title="무료 공개"
                                />
                            </div>
                        </td>
                        <td>
                            <div className={styles.checkboxCenter}>
                                <input 
                                    type="checkbox"
                                    checked={newLesson.is_published}
                                    onChange={(e) => setNewLesson({...newLesson, is_published: e.target.checked})}
                                    style={{ width: '16px', height: '16px' }}
                                    title="공개 여부"
                                />
                            </div>
                        </td>
                        <td>
                            <input 
                                type="datetime-local"
                                className={styles.tableInput}
                                value={newLesson.available_at}
                                onChange={(e) => setNewLesson({...newLesson, available_at: e.target.value})}
                                title="공개 예정일 (비워두면 즉시 공개)"
                            />
                        </td>
                        <td>
                            <div className={styles.actions}>
                                <Button size="sm" onClick={handleAddLesson} disabled={!newLesson.title.trim()}>
                                    <FaPlus /> 등록
                                </Button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

      {/* Video Modal */}
      {videoModalLesson && (
        <LessonVideoModal
          lessonId={videoModalLesson.id}
          lessonTitle={videoModalLesson.title}
          isOpen={true}
          onClose={() => setVideoModalLesson(null)}
        />
      )}

      {/* Resource Modal */}
      {resourceModalLesson && (
        <LessonResourceModal
          lessonId={resourceModalLesson.id}
          lessonTitle={resourceModalLesson.title}
          isOpen={true}
          onClose={() => {
            setResourceModalLesson(null);
            // 자료 수 업데이트를 위해 레슨 목록 다시 불러오기
            const fetchLessons = async () => {
              const { data } = await supabase
                .from('lessons')
                .select('*')
                .eq('course_id', courseId)
                .order('sort_order', { ascending: true });
              if (data) setLessons(data);
            };
            fetchLessons();
          }}
        />
      )}

      {/* Subject Lesson Assignment Modal */}
      {assignSubject && (
        <SubjectLessonModal
          isOpen={true}
          onClose={() => setAssignSubject(null)}
          subjectId={assignSubject.id}
          subjectTitle={assignSubject.title}
          lessons={lessons}
          onAssignLessons={async (lessonIds) => {
            await handleAssignLessonsToSubject(lessonIds, assignSubject.id);
          }}
        />
      )}
    </div>
  );
}
