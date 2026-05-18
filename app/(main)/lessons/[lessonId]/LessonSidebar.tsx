'use client';

import Link from 'next/link';
import { FaCheck, FaLock, FaChevronLeft } from 'react-icons/fa';
import styles from './lesson.module.css';

interface LessonItem {
  id: string;
  title: string;
  sort_order: number;
  is_published: boolean;
  available_at: string | null;
  subject_id: string | null;
}

interface SubjectItem {
  id: string;
  title: string;
}

interface LessonSidebarProps {
  lessons: LessonItem[];
  subjects: SubjectItem[];
  currentLessonId: string;
  completedLessonIds: Set<string>;
  courseId: string;
  cohortId: string;
  courseTitle: string;
}

export default function LessonSidebar({
  lessons,
  subjects,
  currentLessonId,
  completedLessonIds,
  courseId,
  cohortId,
  courseTitle,
}: LessonSidebarProps) {
  const now = new Date();

  // 과목별로 레슨 그룹화 (과목 미배정 강의는 사이드바에서 제외)
  const lessonsBySubject = lessons.reduce((acc, lesson) => {
    if (!lesson.subject_id) return acc;
    const key = lesson.subject_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(lesson);
    return acc;
  }, {} as Record<string, LessonItem[]>);

  // 과목 정보를 맵으로 변환
  const subjectMap = subjects.reduce((acc, subject) => {
    acc[subject.id] = subject;
    return acc;
  }, {} as Record<string, SubjectItem>);

  // 과목 ID 순서 (sort_order 기준으로 정렬된 레슨에서 추출)
  const orderedSubjectIds: string[] = [];
  lessons.forEach(lesson => {
    if (!lesson.subject_id) return;
    const key = lesson.subject_id;
    if (!orderedSubjectIds.includes(key)) {
      orderedSubjectIds.push(key);
    }
  });

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <Link 
          href={`/courses/${courseId}/cohorts/${cohortId}`}
          className={styles.backToCourse}
        >
          <FaChevronLeft /> {courseTitle}
        </Link>
      </div>
      
      <nav className={styles.lessonNav}>
        {orderedSubjectIds.map(subjectId => {
          const subjectLessons = lessonsBySubject[subjectId] || [];
          const subjectTitle = subjectId === 'uncategorized' 
            ? '기타' 
            : subjectMap[subjectId]?.title || '과목';

          return (
            <div key={subjectId} className={styles.subjectGroup}>
              <div className={styles.subjectHeader}>{subjectTitle}</div>
              <ul className={styles.lessonList}>
                {subjectLessons.map((lesson, index) => {
                  const isCompleted = completedLessonIds.has(lesson.id);
                  const isCurrent = lesson.id === currentLessonId;
                  const availableAt = lesson.available_at ? new Date(lesson.available_at) : null;
                  const isScheduled = availableAt && availableAt > now;
                  const isLocked = isScheduled || !lesson.is_published;

                  if (isLocked) {
                    return (
                      <li 
                        key={lesson.id}
                        className={`${styles.lessonNavItem} ${styles.lessonNavItemLocked}`}
                      >
                        <span className={styles.lessonNavIcon}>
                          <FaLock />
                        </span>
                        <span className={styles.lessonNavTitle}>{lesson.title}</span>
                      </li>
                    );
                  }

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className={`${styles.lessonNavItem} ${isCurrent ? styles.lessonNavItemActive : ''} ${isCompleted ? styles.lessonNavItemComplete : ''}`}
                      >
                        <span className={`${styles.lessonNavIcon} ${isCompleted ? styles.iconComplete : ''}`}>
                          {isCompleted ? <FaCheck /> : (index + 1)}
                        </span>
                        <span className={styles.lessonNavTitle}>{lesson.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
