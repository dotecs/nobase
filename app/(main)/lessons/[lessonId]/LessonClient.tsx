'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components';
import { FaCheck, FaUndo } from 'react-icons/fa';
import styles from './lesson.module.css';
import { Database } from '@/lib/database.types';

type LessonProgressUpdate = Database['public']['Tables']['lesson_progress']['Update'];

interface LessonClientProps {
  lessonId: string;
  userId: string;
  isCompleted: boolean;
}

export default function LessonClient({ lessonId, userId, isCompleted }: LessonClientProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(isCompleted);
  const [loading, setLoading] = useState(false);

  const supabase = createClientSupabaseClient();

  const handleComplete = async () => {
    if (completed) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: userId,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        } as any, {
          onConflict: 'user_id,lesson_id',
        });

      if (error) {
        console.error('Error marking lesson as complete:', JSON.stringify(error, null, 2));
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        alert(`레슨 완료 처리 중 오류가 발생했습니다: ${error.message || error.code || '권한이 없습니다.'}`);
        return;
      }

      setCompleted(true);
      router.refresh();
    } catch (err) {
      console.error('Error:', err);
      alert('레슨 완료 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUncomplete = async () => {
    if (!completed) return;
    
    setLoading(true);

    try {
      const updateData: LessonProgressUpdate = {
        completed: false,
        completed_at: null,
      };
      const { error } = await (supabase
        .from('lesson_progress') as any)
        .update(updateData)
        .eq('user_id', userId)
        .eq('lesson_id', lessonId);

      if (error) {
        console.error('Error unmarking lesson:', JSON.stringify(error, null, 2));
        alert(`레슨 완료 취소 중 오류가 발생했습니다: ${error.message || error.code || '권한이 없습니다.'}`);
        return;
      }

      setCompleted(false);
      router.refresh();
    } catch (err) {
      console.error('Error:', err);
      alert('레슨 완료 취소 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.completeSection}>
      {completed ? (
        <div className={styles.completedWrapper}>
          <div className={styles.completedBadge}>
            <span className={styles.completedIcon}><FaCheck /></span>
            <span>학습 완료</span>
          </div>
          <button 
            className={styles.uncompleteButton}
            onClick={handleUncomplete}
            disabled={loading}
          >
            <FaUndo /> 완료 취소
          </button>
        </div>
      ) : (
        <Button
          onClick={handleComplete}
          loading={loading}
          size="lg"
        >
          <FaCheck /> 레슨 완료하기
        </Button>
      )}
    </div>
  );
}
