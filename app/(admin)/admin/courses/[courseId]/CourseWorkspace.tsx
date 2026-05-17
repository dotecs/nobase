'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FaArrowLeft,
  FaBook,
  FaCog,
  FaCopy,
  FaExternalLinkAlt,
  FaGraduationCap,
  FaImage,
  FaLayerGroup,
  FaListUl,
  FaUsers,
} from 'react-icons/fa';
import { useModal } from '@/components/Modal';
import CourseForm from '../CourseForm';
import CurriculumManager from '../components/CurriculumManager';
import CohortsList, { type CohortRow } from './CohortsList';
import DangerZone from './DangerZone';
import styles from './courseWorkspace.module.css';

type TabKey = 'basics' | 'curriculum' | 'cohorts' | 'settings';

interface CourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface CourseWorkspaceProps {
  course: CourseSummary;
  cohorts: CohortRow[];
  lessonCount: number;
  enrollmentCount: number;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CourseWorkspace({
  course,
  cohorts,
  lessonCount,
  enrollmentCount,
}: CourseWorkspaceProps) {
  const [tab, setTab] = useState<TabKey>('basics');
  const { alert } = useModal();

  const handleCopySlug = async () => {
    try {
      await navigator.clipboard.writeText(course.slug);
      await alert({
        title: '복사 완료',
        message: '슬러그가 클립보드에 복사되었습니다.',
        type: 'success',
      });
    } catch {
      await alert({
        title: '복사 실패',
        message: '클립보드 복사에 실패했습니다.',
        type: 'error',
      });
    }
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(course.id);
      await alert({
        title: '복사 완료',
        message: 'ID가 클립보드에 복사되었습니다.',
        type: 'success',
      });
    } catch {
      await alert({
        title: '복사 실패',
        message: '클립보드 복사에 실패했습니다.',
        type: 'error',
      });
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'basics', label: '기본 정보', icon: <FaBook /> },
    { key: 'curriculum', label: '커리큘럼', icon: <FaListUl />, badge: lessonCount },
    { key: 'cohorts', label: '기수', icon: <FaLayerGroup />, badge: cohorts.length },
    { key: 'settings', label: '설정', icon: <FaCog /> },
  ];

  return (
    <main className={styles.main}>
      <Link href="/admin" className={styles.backLink}>
        <FaArrowLeft /> 강좌 목록으로
      </Link>

      {/* Overview Header */}
      <section className={styles.overview}>
        <div className={styles.overviewTop}>
          <div className={styles.thumbnail}>
            {course.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.thumbnail_url} alt={`${course.title} 썸네일`} />
            ) : (
              <FaImage className={styles.thumbnailIcon} />
            )}
          </div>

          <div className={styles.titleBlock}>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{course.title}</h1>
              <span
                className={`${styles.statusBadge} ${
                  course.is_published ? styles.published : styles.draft
                }`}
              >
                {course.is_published ? '공개' : '비공개'}
              </span>
            </div>

            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                슬러그: <code>{course.slug}</code>
                <button
                  type="button"
                  className={styles.metaCopy}
                  onClick={handleCopySlug}
                  title="슬러그 복사"
                >
                  <FaCopy size={12} />
                </button>
              </span>
              <span className={styles.metaItem}>
                마지막 수정: {formatDateTime(course.updated_at)}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <Link
              href="/courses"
              target="_blank"
              rel="noreferrer"
              className={styles.iconLink}
              title="공개 강좌 목록 보기"
            >
              <FaExternalLinkAlt />
            </Link>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaListUl />
            </div>
            <div>
              <div className={styles.statValue}>{lessonCount}</div>
              <div className={styles.statLabel}>레슨</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaLayerGroup />
            </div>
            <div>
              <div className={styles.statValue}>{cohorts.length}</div>
              <div className={styles.statLabel}>기수</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaUsers />
            </div>
            <div>
              <div className={styles.statValue}>{enrollmentCount}</div>
              <div className={styles.statLabel}>등록 수강생</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaGraduationCap />
            </div>
            <div>
              <div className={styles.statValue}>
                {cohorts.filter((c) => c.is_active).length}
              </div>
              <div className={styles.statLabel}>활성 기수</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className={styles.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tab} ${tab === t.key ? styles.active : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
            {typeof t.badge === 'number' && (
              <span className={styles.tabBadge}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels (all wrapped in .tabPanel for identical width) */}
      {tab === 'basics' && (
        <div className={styles.tabPanel}>
          <CourseForm initialData={course} embedded />
        </div>
      )}

      {tab === 'curriculum' && (
        <div className={styles.tabPanel}>
          <CurriculumManager courseId={course.id} />
        </div>
      )}

      {tab === 'cohorts' && (
        <div className={styles.tabPanel}>
          <CohortsList courseId={course.id} cohorts={cohorts} />
        </div>
      )}

      {tab === 'settings' && (
        <div className={`${styles.tabPanel} ${styles.settingsGrid}`}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>강좌 메타 정보</h3>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.metaList}>
                <div className={styles.metaListItem}>
                  <span className={styles.metaListLabel}>강좌 ID</span>
                  <span className={styles.metaListValue}>
                    {course.id}
                    <button
                      type="button"
                      className={styles.metaCopy}
                      onClick={handleCopyId}
                      title="ID 복사"
                    >
                      <FaCopy size={12} />
                    </button>
                  </span>
                </div>
                <div className={styles.metaListItem}>
                  <span className={styles.metaListLabel}>슬러그</span>
                  <span className={styles.metaListValue}>{course.slug}</span>
                </div>
                <div className={styles.metaListItem}>
                  <span className={styles.metaListLabel}>생성일</span>
                  <span className={styles.metaListValue}>
                    {formatDateTime(course.created_at)}
                  </span>
                </div>
                <div className={styles.metaListItem}>
                  <span className={styles.metaListLabel}>마지막 수정일</span>
                  <span className={styles.metaListValue}>
                    {formatDateTime(course.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DangerZone courseId={course.id} courseTitle={course.title} />
        </div>
      )}
    </main>
  );
}
