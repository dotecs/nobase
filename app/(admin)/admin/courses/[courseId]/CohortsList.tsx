'use client';

import Link from 'next/link';
import { FaPlus, FaEdit, FaCalendarAlt, FaUsers } from 'react-icons/fa';
import { Button } from '@/components';
import styles from './courseWorkspace.module.css';

export interface CohortRow {
  id: string;
  title: string;
  slug: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  price: number;
  original_price: number | null;
  max_students: number | null;
  enrollment_count: number;
}

interface CohortsListProps {
  courseId: string;
  cohorts: CohortRow[];
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatPrice(value: number) {
  if (!value) return '무료';
  return `${value.toLocaleString('ko-KR')}원`;
}

export default function CohortsList({ courseId, cohorts }: CohortsListProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>기수 목록 ({cohorts.length})</h3>
        <Button
          size="sm"
          href={`/admin/cohorts/new?courseId=${courseId}`}
          title="새 기수 추가"
        >
          <FaPlus /> 새 기수
        </Button>
      </div>

      {cohorts.length === 0 ? (
        <div className={styles.emptyCohort}>
          <div className={styles.emptyIcon}>
            <FaCalendarAlt />
          </div>
          <p>등록된 기수가 없습니다. 새 기수를 추가하면 수강생이 등록할 수 있습니다.</p>
        </div>
      ) : (
        <table className={styles.cohortTable}>
          <thead>
            <tr>
              <th>기수</th>
              <th>가격</th>
              <th>수강생</th>
              <th>기간</th>
              <th>상태</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => {
              const start = formatDate(cohort.starts_at);
              const end = formatDate(cohort.ends_at);
              const dateLabel = start && end ? `${start} ~ ${end}` : start || end || '-';

              return (
                <tr key={cohort.id}>
                  <td>
                    <div className={styles.cohortTitle}>{cohort.title}</div>
                    {cohort.slug && <div className={styles.cohortSlug}>{cohort.slug}</div>}
                  </td>
                  <td className={styles.priceCell}>{formatPrice(cohort.price)}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <FaUsers size={12} />
                      {cohort.enrollment_count}
                      {cohort.max_students ? ` / ${cohort.max_students}` : ''}
                    </span>
                  </td>
                  <td className={styles.dateCell}>{dateLabel}</td>
                  <td>
                    <span
                      className={`${styles.activeBadge} ${cohort.is_active ? styles.on : styles.off}`}
                    >
                      {cohort.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      href={`/admin/cohorts/${cohort.id}`}
                      className={styles.iconLink}
                      title="기수 수정"
                    >
                      <FaEdit />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
