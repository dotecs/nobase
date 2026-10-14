'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaSearch, FaUserPlus, FaUserShield, FaUser, FaEdit, FaCheckSquare, FaRegSquare } from 'react-icons/fa';
import { useToast } from '@/components';
import { enrollUsersInCohort, type EnrollStatus } from './actions';
import styles from './users.module.css';

// ─────────────────────────────────────────────────────────────
export interface PanelUser {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: 'student' | 'admin';
  created_at: string;
  enrollments: {
    id: string;
    status: string;
    cohort_id: string;
    cohort_title: string;
    course_title: string;
  }[];
}

export interface PanelCohort {
  id: string;
  title: string;
  is_active: boolean;
  starts_at: string | null;
  course_id: string;
  course_title: string;
}

interface Props {
  users: PanelUser[];
  cohorts: PanelCohort[];
}

type Filter = 'new' | 'all' | 'enrolled';

const NEW_DAYS = 7;

const statusLabel: Record<string, string> = {
  active: '수강 중',
  paused: '입금 대기',
  pending: '대기',
  ended: '종료',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });

const isRecent = (iso: string) => Date.now() - new Date(iso).getTime() < NEW_DAYS * 86400_000;

// ─────────────────────────────────────────────────────────────
export default function UserEnrollPanel({ users, cohorts }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [filter, setFilter] = useState<Filter>('new');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cohortId, setCohortId] = useState<string>(() => cohorts.find((c) => c.is_active)?.id ?? cohorts[0]?.id ?? '');
  const [status, setStatus] = useState<EnrollStatus>('active');

  const targetCohort = cohorts.find((c) => c.id === cohortId) ?? null;

  // ── 필터링 ─────────────────────────────────────────────────
  const counts = useMemo(() => {
    const students = users.filter((u) => u.role !== 'admin');
    return {
      new: students.filter((u) => u.enrollments.length === 0).length,
      enrolled: students.filter((u) => u.enrollments.length > 0).length,
      all: users.length,
    };
  }, [users]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'new' && (u.role === 'admin' || u.enrollments.length > 0)) return false;
      if (filter === 'enrolled' && (u.role === 'admin' || u.enrollments.length === 0)) return false;
      if (!q) return true;
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q)
      );
    });
  }, [users, filter, query]);

  const visibleIds = visible.map((u) => u.user_id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });

  // ── 등록 ───────────────────────────────────────────────────
  const alreadyInTarget = (u: PanelUser) => !!targetCohort && u.enrollments.some((e) => e.cohort_id === targetCohort.id);

  const enroll = (ids: string[]) => {
    if (!targetCohort) {
      toast.warning('먼저 등록할 기수를 선택해 주세요.');
      return;
    }
    if (ids.length === 0) {
      toast.warning('등록할 사용자를 선택해 주세요.');
      return;
    }
    startTransition(async () => {
      const result = await enrollUsersInCohort(ids, targetCohort.id, status);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const msg =
        result.inserted > 0
          ? `${result.inserted}명을 "${targetCohort.course_title} · ${targetCohort.title}"에 등록했습니다.` +
            (result.skipped > 0 ? ` (이미 등록된 ${result.skipped}명 제외)` : '')
          : `선택한 ${result.skipped}명은 이미 해당 기수에 등록되어 있습니다.`;
      if (result.inserted > 0) toast.success(msg);
      else toast.info(msg);
      setSelected(new Set());
      router.refresh();
    });
  };

  // ── 렌더 ───────────────────────────────────────────────────
  return (
    <div className={styles.panel}>
      {/* 등록 도구 모음 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <label className={styles.toolbarLabel} htmlFor="target-cohort">
            등록할 기수
          </label>
          <select
            id="target-cohort"
            className={styles.select}
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
          >
            {cohorts.length === 0 && <option value="">기수가 없습니다</option>}
            {groupByCourse(cohorts).map(([courseTitle, list]) => (
              <optgroup key={courseTitle} label={courseTitle}>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.starts_at ? ` (${fmtDate(c.starts_at)}~)` : ''}
                    {c.is_active ? '' : ' · 비활성'}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className={styles.toolbarGroup}>
          <label className={styles.toolbarLabel} htmlFor="target-status">
            등록 상태
          </label>
          <select
            id="target-status"
            className={styles.select}
            value={status}
            onChange={(e) => setStatus(e.target.value as EnrollStatus)}
          >
            <option value="active">수강 중 (바로 학습 가능)</option>
            <option value="paused">입금 대기 (확인 후 승인)</option>
          </select>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          disabled={pending || selected.size === 0 || !targetCohort}
          onClick={() => enroll(Array.from(selected))}
        >
          <FaUserPlus /> 선택한 {selected.size}명 등록
        </button>
      </div>

      {/* 필터 + 검색 */}
      <div className={styles.filterRow}>
        <div className={styles.chips}>
          <FilterChip active={filter === 'new'} onClick={() => setFilter('new')}>
            신규 · 미등록 <span className={styles.chipCount}>{counts.new}</span>
          </FilterChip>
          <FilterChip active={filter === 'enrolled'} onClick={() => setFilter('enrolled')}>
            수강 등록됨 <span className={styles.chipCount}>{counts.enrolled}</span>
          </FilterChip>
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            전체 <span className={styles.chipCount}>{counts.all}</span>
          </FilterChip>
        </div>
        <div className={styles.search}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="이름 · 이메일 · 전화번호 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 목록 */}
      {visible.length === 0 ? (
        <div className={styles.empty}>
          {filter === 'new' ? '미등록 신규 회원이 없습니다.' : '조건에 맞는 사용자가 없습니다.'}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCol}>
                  <button type="button" className={styles.checkBtn} onClick={toggleAllVisible} title="표시된 전체 선택">
                    {allVisibleSelected ? <FaCheckSquare /> : <FaRegSquare />}
                  </button>
                </th>
                <th>사용자</th>
                <th>연락처</th>
                <th>수강 현황</th>
                <th>가입일</th>
                <th className={styles.actionCol}>등록</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => {
                const checked = selected.has(u.user_id);
                const inTarget = alreadyInTarget(u);
                return (
                  <tr key={u.user_id} className={checked ? styles.rowSelected : ''}>
                    <td className={styles.checkCol}>
                      <button type="button" className={styles.checkBtn} onClick={() => toggle(u.user_id)}>
                        {checked ? <FaCheckSquare /> : <FaRegSquare />}
                      </button>
                    </td>
                    <td>
                      <div className={styles.userCell}>
                        <span className={`${styles.avatar} ${u.role === 'admin' ? styles.avatarAdmin : ''}`}>
                          {u.role === 'admin' ? <FaUserShield /> : <FaUser />}
                        </span>
                        <div className={styles.userText}>
                          <span className={styles.userName}>
                            {u.name || '이름 없음'}
                            {u.role === 'admin' && <span className={styles.roleTag}>관리자</span>}
                            {u.role !== 'admin' && isRecent(u.created_at) && <span className={styles.newTag}>NEW</span>}
                          </span>
                          <span className={styles.userEmail}>{u.email || u.user_id.slice(0, 8) + '…'}</span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.muted}>{u.phone || '-'}</td>
                    <td>
                      {u.enrollments.length === 0 ? (
                        <span className={styles.none}>미등록</span>
                      ) : (
                        <div className={styles.enrollTags}>
                          {u.enrollments.map((e) => (
                            <span key={e.id} className={`${styles.enrollTag} ${styles[`st_${e.status}`] || ''}`}>
                              {e.course_title} · {e.cohort_title}
                              <em>{statusLabel[e.status] || e.status}</em>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={styles.muted}>{fmtDate(u.created_at)}</td>
                    <td className={styles.actionCol}>
                      <div className={styles.rowActions}>
                        {inTarget ? (
                          <span className={styles.doneTag}>등록됨</span>
                        ) : (
                          <button
                            type="button"
                            className={styles.rowEnrollBtn}
                            disabled={pending || !targetCohort}
                            onClick={() => enroll([u.user_id])}
                            title={targetCohort ? `${targetCohort.course_title} · ${targetCohort.title}에 등록` : ''}
                          >
                            <FaUserPlus /> 등록
                          </button>
                        )}
                        <Link href={`/admin/users/${u.user_id}`} className={styles.iconLink} title="상세보기">
                          <FaEdit />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`${styles.chip} ${active ? styles.chipActive : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

function groupByCourse(cohorts: PanelCohort[]): [string, PanelCohort[]][] {
  const map = new Map<string, PanelCohort[]>();
  for (const c of cohorts) {
    const list = map.get(c.course_title) ?? [];
    list.push(c);
    map.set(c.course_title, list);
  }
  return Array.from(map.entries());
}
