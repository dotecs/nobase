'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase-client';
import {
  FaTimes,
  FaLock,
  FaLockOpen,
  FaTrash,
  FaSearch,
  FaSpinner,
  FaCheck,
  FaUser,
  FaUsers,
} from 'react-icons/fa';
import { Button } from '@/components';
import { useModal } from '@/components/Modal';
import type { SubjectVisibility } from '@/lib/database.types';
import styles from './SubjectVisibilityModal.module.css';

interface SubjectVisibilityModalProps {
  subjectId: string;
  subjectTitle: string;
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (visibility: SubjectVisibility) => void;
}

type EnrolledUser = {
  user_id: string;
  name: string | null;
  phone: string | null;
};

type CohortOption = {
  id: string;
  title: string;
  slug: string | null;
  is_active: boolean;
  memberCount: number;
};

export default function SubjectVisibilityModal({
  subjectId,
  subjectTitle,
  courseId,
  isOpen,
  onClose,
  onSaved,
}: SubjectVisibilityModalProps) {
  const supabase = createClientSupabaseClient() as any;
  const { alert, confirm } = useModal();

  const [isLoading, setIsLoading] = useState(false);
  const [visibility, setVisibility] = useState<SubjectVisibility>('public');
  const [allowlist, setAllowlist] = useState<EnrolledUser[]>([]);
  const [candidates, setCandidates] = useState<EnrolledUser[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [allowedCohortIds, setAllowedCohortIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savingCohortIds, setSavingCohortIds] = useState<Set<string>>(new Set());
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);

      const { data: subjectData } = await supabase
        .from('subjects')
        .select('visibility')
        .eq('id', subjectId)
        .single();

      const { data: visibilityRows } = await supabase
        .from('subject_visibility')
        .select('user_id')
        .eq('subject_id', subjectId);

      const allowedIds: string[] = (visibilityRows || []).map((r: { user_id: string }) => r.user_id);

      const { data: cohortVisibilityRows } = await supabase
        .from('subject_visibility_cohorts')
        .select('cohort_id')
        .eq('subject_id', subjectId);

      const allowedCohortIdList: string[] = (cohortVisibilityRows || []).map(
        (r: { cohort_id: string }) => r.cohort_id
      );

      const { data: cohortRows } = await supabase
        .from('cohorts')
        .select('id, title, slug, is_active')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      // 이 코스의 등록된 유저 목록 (검색 후보) + cohort별 인원수
      const { data: enrollmentRows } = await supabase
        .from('enrollments')
        .select('user_id, cohort_id, cohorts!inner(course_id)')
        .eq('status', 'active')
        .eq('cohorts.course_id', courseId);

      const memberCountByCohort = new Map<string, number>();
      const enrolledIdsSet = new Set<string>();
      ((enrollmentRows || []) as { user_id: string; cohort_id: string }[]).forEach((r) => {
        enrolledIdsSet.add(r.user_id);
        memberCountByCohort.set(r.cohort_id, (memberCountByCohort.get(r.cohort_id) || 0) + 1);
      });
      const enrolledIds = Array.from(enrolledIdsSet);

      const cohortOptions: CohortOption[] = ((cohortRows || []) as {
        id: string;
        title: string;
        slug: string | null;
        is_active: boolean;
      }[]).map((c) => ({
        ...c,
        memberCount: memberCountByCohort.get(c.id) || 0,
      }));

      const idsToFetch = Array.from(new Set([...enrolledIds, ...allowedIds]));

      let profileMap = new Map<string, EnrolledUser>();
      if (idsToFetch.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, phone')
          .in('user_id', idsToFetch);
        (profilesData || []).forEach((p: EnrolledUser) => {
          profileMap.set(p.user_id, p);
        });
      }

      if (cancelled) return;

      const allow = allowedIds
        .map((id) => profileMap.get(id) || { user_id: id, name: null, phone: null });
      const cand = enrolledIds
        .filter((id) => !allowedIds.includes(id))
        .map((id) => profileMap.get(id) || { user_id: id, name: null, phone: null });

      setVisibility((subjectData?.visibility || 'public') as SubjectVisibility);
      setAllowlist(allow);
      setCandidates(cand);
      setCohorts(cohortOptions);
      setAllowedCohortIds(new Set(allowedCohortIdList));
      setIsLoading(false);
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [isOpen, subjectId, courseId, supabase]);

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) => {
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        c.user_id.toLowerCase().includes(q)
      );
    });
  }, [candidates, searchQuery]);

  const handleToggleVisibility = async () => {
    const next: SubjectVisibility = visibility === 'public' ? 'restricted' : 'public';

    if (next === 'public') {
      const ok = await confirm({
        title: '공개로 전환',
        message: '모든 수강생이 이 과목을 볼 수 있게 됩니다. 계속하시겠습니까?',
        type: 'warning',
      });
      if (!ok) return;
    }

    setTogglingVisibility(true);
    const { error } = await supabase
      .from('subjects')
      .update({ visibility: next, updated_at: new Date().toISOString() })
      .eq('id', subjectId);
    setTogglingVisibility(false);

    if (error) {
      alert({ title: '오류', message: error.message || '변경 실패', type: 'error' });
      return;
    }
    setVisibility(next);
    onSaved?.(next);
  };

  const addUser = async (user: EnrolledUser) => {
    setSavingIds((prev) => new Set(prev).add(user.user_id));
    const { error } = await supabase
      .from('subject_visibility')
      .insert({ subject_id: subjectId, user_id: user.user_id });
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(user.user_id);
      return next;
    });

    if (error) {
      alert({ title: '오류', message: error.message || '추가 실패', type: 'error' });
      return;
    }
    setAllowlist((prev) => [...prev, user]);
    setCandidates((prev) => prev.filter((c) => c.user_id !== user.user_id));
  };

  const toggleCohort = async (cohort: CohortOption) => {
    const isAllowed = allowedCohortIds.has(cohort.id);
    setSavingCohortIds((prev) => new Set(prev).add(cohort.id));

    const { error } = isAllowed
      ? await supabase
          .from('subject_visibility_cohorts')
          .delete()
          .eq('subject_id', subjectId)
          .eq('cohort_id', cohort.id)
      : await supabase
          .from('subject_visibility_cohorts')
          .insert({ subject_id: subjectId, cohort_id: cohort.id });

    setSavingCohortIds((prev) => {
      const next = new Set(prev);
      next.delete(cohort.id);
      return next;
    });

    if (error) {
      alert({ title: '오류', message: error.message || '변경 실패', type: 'error' });
      return;
    }

    setAllowedCohortIds((prev) => {
      const next = new Set(prev);
      if (isAllowed) next.delete(cohort.id);
      else next.add(cohort.id);
      return next;
    });
  };

  const removeUser = async (user: EnrolledUser) => {
    setSavingIds((prev) => new Set(prev).add(user.user_id));
    const { error } = await supabase
      .from('subject_visibility')
      .delete()
      .eq('subject_id', subjectId)
      .eq('user_id', user.user_id);
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(user.user_id);
      return next;
    });

    if (error) {
      alert({ title: '오류', message: error.message || '제거 실패', type: 'error' });
      return;
    }
    setAllowlist((prev) => prev.filter((u) => u.user_id !== user.user_id));
    setCandidates((prev) => [user, ...prev]);
  };

  if (!isOpen) return null;

  const isRestricted = visibility === 'restricted';

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>공개 대상 관리</h2>
            <p className={styles.subtitle}>
              <span className={styles.subjectName}>{subjectTitle}</span>
            </p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="닫기">
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
              <div className={styles.visibilityCard}>
                <div className={styles.visibilityInfo}>
                  <span className={`${styles.visibilityIcon} ${isRestricted ? styles.restrictedIcon : styles.publicIcon}`}>
                    {isRestricted ? <FaLock /> : <FaLockOpen />}
                  </span>
                  <div>
                    <div className={styles.visibilityLabel}>
                      {isRestricted ? '제한 공개 (화이트리스트)' : '전체 공개'}
                    </div>
                    <div className={styles.visibilityDesc}>
                      {isRestricted
                        ? '아래 등록된 유저에게만 이 과목과 하위 강의가 노출됩니다.'
                        : '수강 등록한 모든 유저가 볼 수 있습니다.'}
                    </div>
                  </div>
                </div>
                <Button
                  variant={isRestricted ? 'outline' : 'primary'}
                  size="sm"
                  onClick={handleToggleVisibility}
                  loading={togglingVisibility}
                >
                  {isRestricted ? '전체 공개로 전환' : '제한 공개로 전환'}
                </Button>
              </div>

              {isRestricted && (
                <>
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        <FaUsers style={{ marginRight: 6, verticalAlign: '-2px' }} />
                        코호트(기수) 단위 공개 ({allowedCohortIds.size}/{cohorts.length})
                      </h3>
                    </div>
                    <p className={styles.sectionHint}>
                      선택한 코호트에 <strong>현재 및 앞으로</strong> active 등록되는 모든 유저가 자동으로 이 과목을 볼 수 있습니다.
                    </p>
                    {cohorts.length === 0 ? (
                      <div className={styles.emptyState}>
                        이 코스에 등록된 코호트가 없습니다.
                      </div>
                    ) : (
                      <ul className={styles.cohortList}>
                        {cohorts.map((cohort) => {
                          const active = allowedCohortIds.has(cohort.id);
                          const saving = savingCohortIds.has(cohort.id);
                          return (
                            <li
                              key={cohort.id}
                              className={`${styles.cohortItem} ${active ? styles.cohortItemActive : ''}`}
                            >
                              <label className={styles.cohortLabel}>
                                <input
                                  type="checkbox"
                                  checked={active}
                                  disabled={saving}
                                  onChange={() => toggleCohort(cohort)}
                                  className={styles.cohortCheckbox}
                                />
                                <div className={styles.cohortInfo}>
                                  <span className={styles.cohortTitle}>
                                    {cohort.title}
                                    {!cohort.is_active && (
                                      <span className={styles.cohortInactiveBadge}>비활성</span>
                                    )}
                                  </span>
                                  <span className={styles.cohortMeta}>
                                    등록 유저 {cohort.memberCount}명
                                    {cohort.slug ? ` · ${cohort.slug}` : ''}
                                  </span>
                                </div>
                                {saving && <FaSpinner className={styles.spinner} />}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        <FaUser style={{ marginRight: 6, verticalAlign: '-2px' }} />
                        개별 유저 공개 ({allowlist.length}명)
                      </h3>
                    </div>
                    {allowlist.length === 0 ? (
                      <div className={styles.emptyState}>
                        아직 등록된 유저가 없습니다. 아래에서 유저를 추가하세요.
                      </div>
                    ) : (
                      <ul className={styles.userList}>
                        {allowlist.map((user) => (
                          <li key={user.user_id} className={styles.userItem}>
                            <span className={styles.userAvatar}>
                              <FaUser />
                            </span>
                            <div className={styles.userInfo}>
                              <span className={styles.userName}>
                                {user.name || '(이름 없음)'}
                              </span>
                              <span className={styles.userMeta}>
                                {user.phone || user.user_id}
                              </span>
                            </div>
                            <button
                              className={styles.removeBtn}
                              onClick={() => removeUser(user)}
                              disabled={savingIds.has(user.user_id)}
                              title="제거"
                            >
                              {savingIds.has(user.user_id) ? (
                                <FaSpinner className={styles.spinner} />
                              ) : (
                                <FaTrash />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <h3 className={styles.sectionTitle}>
                        수강 등록된 유저 중 추가 ({filteredCandidates.length}명)
                      </h3>
                    </div>
                    <div className={styles.searchWrap}>
                      <FaSearch className={styles.searchIcon} />
                      <input
                        type="text"
                        placeholder="이름, 전화번호로 검색"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                      />
                    </div>
                    {filteredCandidates.length === 0 ? (
                      <div className={styles.emptyState}>
                        {searchQuery
                          ? '검색 결과가 없습니다.'
                          : '수강 등록된 유저가 모두 허용목록에 있습니다.'}
                      </div>
                    ) : (
                      <ul className={styles.userList}>
                        {filteredCandidates.map((user) => (
                          <li key={user.user_id} className={styles.userItem}>
                            <span className={styles.userAvatar}>
                              <FaUser />
                            </span>
                            <div className={styles.userInfo}>
                              <span className={styles.userName}>
                                {user.name || '(이름 없음)'}
                              </span>
                              <span className={styles.userMeta}>
                                {user.phone || user.user_id}
                              </span>
                            </div>
                            <button
                              className={styles.addBtn}
                              onClick={() => addUser(user)}
                              disabled={savingIds.has(user.user_id)}
                            >
                              {savingIds.has(user.user_id) ? (
                                <FaSpinner className={styles.spinner} />
                              ) : (
                                <>
                                  <FaCheck /> 추가
                                </>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
