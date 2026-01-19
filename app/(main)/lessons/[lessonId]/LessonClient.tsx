'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components';
import { FaCheck } from 'react-icons/fa';
import styles from './lesson.module.css';

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

  return (
    <div className={styles.completeSection}>
      {completed ? (
        <div className={styles.completedBadge}>
          <span className={styles.completedIcon}><FaCheck /></span>
          <span>학습 완료</span>
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
