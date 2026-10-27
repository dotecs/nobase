'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import { FaArrowLeft, FaUser, FaGraduationCap } from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import { UserRole } from '@/lib/database.types';
import styles from '../courses/courseForm.module.css';
import enrollmentStyles from './users.module.css';
import { canTransition, ENROLLMENT_STATUS_LABEL } from '@/lib/enrollment-status';
import { updateEnrollmentStatus } from './actions';
import type { Database } from '@/lib/database.types';

type StatusTarget = 'active' | 'on_hold' | 'ended';
type StatusEvent = Database['public']['Tables']['enrollment_status_events']['Row'] & { actorName: string };
const actionLabels: Record<StatusTarget, string> = { active: '재개', on_hold: '일시정지', ended: '종료' };

function EnrollmentRow({ enrollment }: { enrollment: Enrollment }) {
  const router = useRouter();
  const [target, setTarget] = useState<StatusTarget | null>(null);
  const [reason, setReason] = useState(''), [pending, setPending] = useState(false), [message, setMessage] = useState('');
  const [events, setEvents] = useState<StatusEvent[]>([]), [historyMessage, setHistoryMessage] = useState('이력 불러오는 중…'), [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      const client = createClientSupabaseClient();
      const result = await client.from('enrollment_status_events').select('*').eq('enrollment_id', enrollment.id).order('created_at', { ascending: false }).limit(3);
      if (result.error) throw result.error;
      const rows = (result.data ?? []) as Database['public']['Tables']['enrollment_status_events']['Row'][];
      const actorIds = [...new Set(rows.flatMap(row => row.actor_id ? [row.actor_id] : []))];
      const profiles = actorIds.length ? await client.from('profiles').select('user_id,name').in('user_id', actorIds) : { data: [] };
      const names = new Map(((profiles.data ?? []) as { user_id: string; name: string | null }[]).map(profile => [profile.user_id, profile.name]));
      if (!cancelled) {
        setEvents(rows.map(row => ({ ...row, actorName: (row.actor_id && names.get(row.actor_id)) || '관리자' })));
        setHistoryMessage(rows.length ? '' : '변경 이력이 없습니다.');
      }
    }
    loadHistory().catch(() => { if (!cancelled) { setEvents([]); setHistoryMessage('이력을 불러오지 못했습니다. 044 적용 여부를 확인해 주세요.'); } });
    return () => { cancelled = true; };
  }, [enrollment.id, enrollment.status, revision]);
  const targets = enrollment.status === 'paused' || enrollment.status === 'pending' ? [] : (['on_hold', 'ended', 'active'] as const).filter(to => canTransition(enrollment.status, to));
  const submit = async () => {
    if (!target || pending) return;
    if (reason.trim().length < 2 || reason.trim().length > 200) { setMessage('사유를 2~200자로 입력해 주세요.'); return; }
    setPending(true); setMessage('');
    try {
      const result = await updateEnrollmentStatus({ enrollmentId: enrollment.id, to: target, reason });
      setMessage(result.ok ? `${ENROLLMENT_STATUS_LABEL[target]} 상태로 변경했습니다.` : result.error);
      setTarget(null); setReason(''); setRevision(value => value + 1); router.refresh();
    } catch { setMessage('변경 요청을 처리하지 못했습니다.'); }
    finally { setPending(false); }
  };
  return <article className={styles.formSection}>
    <div className={enrollmentStyles.userName}>{enrollment.cohort.course.title} · {enrollment.cohort.title}</div>
    <span className={`${enrollmentStyles.enrollTag} ${enrollmentStyles[`st_${enrollment.status}`] || ''}`}><em>{ENROLLMENT_STATUS_LABEL[enrollment.status] ?? enrollment.status}</em></span>
    <div className={enrollmentStyles.rowActions}>
      {targets.map(to => <button key={to} type="button" className={enrollmentStyles.rowEnrollBtn} disabled={pending} onClick={() => { setTarget(to); setReason(''); setMessage(''); }}>{actionLabels[to]}</button>)}
    </div>
    {target && <div className={styles.formGroup} role="group" aria-label="수강 상태 변경 확인">
      <p>{enrollment.cohort.title} 기수를 {ENROLLMENT_STATUS_LABEL[target]} 상태로 변경합니다.</p>
      <label className={styles.label} htmlFor={`reason-${enrollment.id}`}>변경 사유 (필수, 2~200자)</label>
      <textarea id={`reason-${enrollment.id}`} className={styles.textarea} value={reason} maxLength={200} aria-required="true" disabled={pending} onChange={event => setReason(event.target.value)} />
      <div className={enrollmentStyles.rowActions}>
        <button type="button" className={enrollmentStyles.rowEnrollBtn} disabled={pending || reason.trim().length < 2} onClick={submit}>{pending ? '변경 중…' : '확인'}</button>
        <button type="button" className={enrollmentStyles.rowEnrollBtn} disabled={pending} onClick={() => setTarget(null)}>취소</button>
      </div>
    </div>}
    {message && <p role="status">{message}</p>}
    <div className={styles.helpText}>
      <p>최근 변경 이력</p>
      {historyMessage && <p role="status">{historyMessage}</p>}
      <ul>{events.map(event => <li key={event.id}>
        <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</time>
        {' · '}{ENROLLMENT_STATUS_LABEL[event.from_status] ?? event.from_status} → {ENROLLMENT_STATUS_LABEL[event.to_status] ?? event.to_status}
        {' · '}{event.reason || '사유 없음'} · {event.actorName}
      </li>)}</ul>
    </div>
  </article>;
}

interface Enrollment {
  id: string;
  status: string;
  cohort: {
    id: string;
    title: string;
    course: {
      id: string;
      title: string;
    };
  };
}

interface UserDetailProps {
  user: {
    user_id: string;
    name: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
  };
  enrollments: Enrollment[];
}

export default function UserDetail({ user, enrollments }: UserDetailProps) {
  const router = useRouter();
  // Admin 페이지에서는 RLS 정책이 적용되지 않으므로 any 타입 사용
  const supabase = createClientSupabaseClient() as any;
  const { alert } = useModal();

  const [formData, setFormData] = useState({
    name: user.name || '',
    role: user.role,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name || null,
          role: formData.role as UserRole,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.user_id);

      if (error) throw error;

      await alert({
        title: '수정 완료',
        message: '사용자 정보가 성공적으로 수정되었습니다.',
        type: 'success',
      });

      router.refresh();
    } catch (error: any) {
      await alert({
        title: '오류 발생',
        message: error.message || '저장 중 오류가 발생했습니다.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <Link href="/admin/users" className={styles.backLink}>
          <FaArrowLeft /> 목록으로 돌아가기
        </Link>
        <h1>사용자 상세</h1>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            <FaUser /> 기본 정보
          </h2>

          <div className={styles.formGroup}>
            <label className={styles.label}>사용자 ID</label>
            <input
              type="text"
              value={user.user_id}
              className={styles.input}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              이름
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={styles.input}
              placeholder="사용자 이름"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="role" className={styles.label}>
              역할
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={styles.input}
            >
              <option value="student">학생</option>
              <option value="admin">관리자</option>
            </select>
            <span className={styles.helpText}>
              관리자 역할은 모든 콘텐츠에 접근할 수 있습니다.
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>가입일</label>
            <input
              type="text"
              value={new Date(user.created_at).toLocaleString('ko-KR')}
              className={styles.input}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>
        </div>

        {/* 수강 현황 */}
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>
            <FaGraduationCap /> 수강 현황 ({enrollments.length}개)
          </h2>

          {enrollments.length > 0 ? (
            <div className={enrollmentStyles.panel}>
              {enrollments.map(enrollment => <EnrollmentRow key={enrollment.id} enrollment={enrollment} />)}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--space-6)' }}>
              수강 중인 강좌가 없습니다.
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className={styles.formActions}>
          <Button type="button" variant="outline" href="/admin/users">
            취소
          </Button>
          <Button type="submit" loading={isSubmitting}>
            저장
          </Button>
        </div>
      </form>
    </main>
  );
}
