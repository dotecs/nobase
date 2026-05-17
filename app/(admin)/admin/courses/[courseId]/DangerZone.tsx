'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaTrash } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import styles from './courseWorkspace.module.css';

interface DangerZoneProps {
  courseId: string;
  courseTitle: string;
}

export default function DangerZone({ courseId, courseTitle }: DangerZoneProps) {
  const router = useRouter();
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: '강좌 삭제',
      message: `"${courseTitle}" 강좌를 삭제하시겠습니까? 관련된 모든 기수, 레슨, 수강 정보가 함께 삭제되며 되돌릴 수 없습니다.`,
      type: 'error',
      danger: true,
      confirmText: '삭제',
    });

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;

      await alert({
        title: '삭제 완료',
        message: '강좌가 성공적으로 삭제되었습니다.',
        type: 'success',
      });
      router.push('/admin');
    } catch (err: any) {
      await alert({
        title: '삭제 실패',
        message: err.message || '삭제 중 오류가 발생했습니다.',
        type: 'error',
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.dangerZone}>
      <h3 className={styles.dangerTitle}>
        <FaTrash /> 위험 구역
      </h3>
      <p className={styles.dangerDescription}>
        강좌를 삭제하면 관련된 모든 기수, 레슨, 수강 정보가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
      </p>
      <Button type="button" variant="danger" onClick={handleDelete} loading={isDeleting}>
        <FaTrash /> 강좌 삭제
      </Button>
    </div>
  );
}
