'use client';

import { useState, useEffect } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import type { Lesson } from '@/lib/database.types';
import { FaPlus, FaTrash, FaSave } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import styles from './CurriculumManager.module.css';

interface CurriculumManagerProps {
  courseId: string;
}

interface EditingLesson extends Lesson {
  isDirty?: boolean;
}

export default function CurriculumManager({ courseId }: CurriculumManagerProps) {
  // Admin 페이지에서는 RLS 정책으로 인한 타입 제한을 우회
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();

  const [lessons, setLessons] = useState<EditingLesson[]>([]);
  const [, setIsLoading] = useState(false);
  
  // New Lesson State
  const [newLesson, setNewLesson] = useState({
    title: '',
    vimeo_url: '',
    sort_order: 1,
    is_published: true,
  });

  // Fetch Lessons
  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('sort_order', { ascending: true });

      setIsLoading(false);

      if (error) {
        console.error('Error fetching lessons:', error);
        return;
      }

      setLessons(data || []);
      
      // Calculate next sort order
      if (data && data.length > 0) {
        const maxOrder = Math.max(...data.map((l: Lesson) => l.sort_order));
        setNewLesson(prev => ({ ...prev, sort_order: maxOrder + 1 }));
      } else {
        setNewLesson(prev => ({ ...prev, sort_order: 1 }));
      }
    };

    fetchLessons();
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
             vimeo_url: lesson.vimeo_url,
             is_published: lesson.is_published,
             updated_at: new Date().toISOString(),
        })
        .eq('id', lesson.id);

      if (error) throw error;

      // Reset dirty state
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, isDirty: false } : l));
      
      // Optional: Show simplified toast/feedback
      // await alert({ title: '저장 완료', message: '변경사항이 저장되었습니다.', type: 'success' });
    } catch (err: any) {
      alert({ title: '오류', message: err.message || '저장 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  // Add New Lesson
  const handleAddLesson = async () => {
    if (!newLesson.title.trim()) {
        alert({ title: '오류', message: '제목을 입력해주세요.', type: 'warning' });
        return;
    }

    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          course_id: courseId,
          title: newLesson.title,
          sort_order: newLesson.sort_order,
          vimeo_url: newLesson.vimeo_url,
          is_published: newLesson.is_published,
          resources: []
        })
        .select()
        .single();

      if (error) throw error;

      // Add to list and reset new lesson input
      setLessons(prev => [...prev, data]);
      setNewLesson({
        title: '',
        vimeo_url: '',
        sort_order: (data.sort_order || 0) + 1,
        is_published: true,
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
      </div>

      {/* Lesson Table */}
      <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{ width: '80px' }}>순서</th>
                        <th>제목</th>
                        <th>Vimeo URL</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>공개</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>관리</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Existing Lessons */}
                    {lessons.map((lesson) => (
                        <tr key={lesson.id}>
                            <td>
                                <input 
                                    type="number"
                                    className={styles.tableInput}
                                    value={lesson.sort_order}
                                    onChange={(e) => handleLessonChange(lesson.id, 'sort_order', parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                />
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
                                <input 
                                    type="text"
                                    className={styles.tableInput}
                                    value={lesson.vimeo_url || ''}
                                    onChange={(e) => handleLessonChange(lesson.id, 'vimeo_url', e.target.value)}
                                    placeholder="https://vimeo.com/..."
                                />
                            </td>
                            <td>
                                <div className={styles.checkboxCenter}>
                                    <input 
                                        type="checkbox"
                                        checked={lesson.is_published}
                                        onChange={(e) => handleLessonChange(lesson.id, 'is_published', e.target.checked)}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                </div>
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
                         <td>
                            <input 
                                type="number"
                                className={styles.tableInput}
                                value={newLesson.sort_order}
                                onChange={(e) => setNewLesson({...newLesson, sort_order: parseInt(e.target.value) || 0})}
                                placeholder="Auto"
                            />
                        </td>
                        <td>
                            <input 
                                type="text"
                                className={styles.tableInput}
                                value={newLesson.title}
                                onChange={(e) => setNewLesson({...newLesson, title: e.target.value})}
                                placeholder="새 레슨 추가..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddLesson();
                                }}
                            />
                        </td>
                        <td>
                            <input 
                                type="text"
                                className={styles.tableInput}
                                value={newLesson.vimeo_url}
                                onChange={(e) => setNewLesson({...newLesson, vimeo_url: e.target.value})}
                                placeholder="https://vimeo.com/... (선택)"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddLesson();
                                }}
                            />
                        </td>
                         <td>
                                <div className={styles.checkboxCenter}>
                                    <input 
                                        type="checkbox"
                                        checked={newLesson.is_published}
                                        onChange={(e) => setNewLesson({...newLesson, is_published: e.target.checked})}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                </div>
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
    </div>
  );
}
