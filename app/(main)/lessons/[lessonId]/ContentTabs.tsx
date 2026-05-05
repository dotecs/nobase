'use client';

import { useState, type ReactNode } from 'react';
import styles from './lesson.module.css';

type ContentTabKey = 'notice' | 'intro' | 'instructor' | 'resources' | 'stats';

interface ContentTabsProps {
  noticeContent?: ReactNode;
  introContent?: ReactNode;
  instructorContent?: ReactNode;
  resourcesContent?: ReactNode;
  statsContent?: ReactNode;
}

const TAB_LABELS: Record<ContentTabKey, string> = {
  notice: '공지사항',
  intro: '강의소개',
  instructor: '강사소개',
  resources: '강의자료',
  stats: '학습통계',
};

export default function ContentTabs({
  noticeContent,
  introContent,
  instructorContent,
  resourcesContent,
  statsContent,
}: ContentTabsProps) {
  const [active, setActive] = useState<ContentTabKey>('resources');

  const renderBody = () => {
    switch (active) {
      case 'notice':
        return noticeContent ?? <EmptyState text="등록된 공지사항이 없습니다." />;
      case 'intro':
        return introContent ?? <EmptyState text="강의 소개가 곧 추가됩니다." />;
      case 'instructor':
        return instructorContent ?? <EmptyState text="강사 소개가 곧 추가됩니다." />;
      case 'resources':
        return resourcesContent ?? <EmptyState text="첨부된 학습 자료가 없습니다." />;
      case 'stats':
        return statsContent ?? <EmptyState text="학습 통계가 준비 중입니다." />;
      default:
        return null;
    }
  };

  return (
    <section className={styles.contentTabsCard}>
      <div className={styles.contentTabsHeader}>
        {(Object.keys(TAB_LABELS) as ContentTabKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`${styles.contentTab} ${active === key ? styles.contentTabActive : ''}`}
            onClick={() => setActive(key)}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>
      <div className={styles.contentTabsBody}>{renderBody()}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className={styles.contentTabEmpty}>{text}</div>;
}
