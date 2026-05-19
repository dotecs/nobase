'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaCheck, FaLock, FaChevronDown, FaChevronUp, FaPlay, FaRegFileAlt } from 'react-icons/fa';
import styles from './lesson.module.css';

interface LessonItem {
  id: string;
  title: string;
  sort_order: number;
  is_published: boolean;
  available_at: string | null;
  subject_id: string | null;
  duration_seconds?: number | null;
}

interface SubjectItem {
  id: string;
  title: string;
}

interface CourseSidebarProps {
  lessons: LessonItem[];
  subjects: SubjectItem[];
  currentLessonId: string;
  completedLessonIds: Set<string>;
  /** lesson.id → 진행률(0~100). 완료된 강의는 100, 미시청은 키 없음 */
  lessonProgressPercent?: Record<string, number>;
}

type SidebarTab = 'curriculum' | 'notes' | 'community';

function formatDurationShort(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export default function CourseSidebar({
  lessons,
  subjects,
  currentLessonId,
  completedLessonIds,
  lessonProgressPercent,
}: CourseSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('curriculum');
  const now = new Date();

  // VideoPlayer가 진도 저장 시 dispatch하는 이벤트를 받아 실시간 % 갱신
  const [livePercent, setLivePercent] = useState<Record<string, number>>({});
  const [liveCompleted, setLiveCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { lessonId: string; percent: number; completed: boolean }
        | undefined;
      if (!detail) return;
      setLivePercent((prev) => {
        const prevPct = prev[detail.lessonId] ?? 0;
        if (detail.percent <= prevPct) return prev;
        return { ...prev, [detail.lessonId]: detail.percent };
      });
      if (detail.completed) {
        setLiveCompleted((prev) => {
          if (prev.has(detail.lessonId)) return prev;
          const next = new Set(prev);
          next.add(detail.lessonId);
          return next;
        });
      }
    };
    window.addEventListener('lesson-progress', handler);
    return () => window.removeEventListener('lesson-progress', handler);
  }, []);

  // 과목별 그룹화 (과목 미배정 강의는 사이드바에서 제외)
  const grouped = useMemo(() => {
    const map: Record<string, LessonItem[]> = {};
    const order: string[] = [];
    lessons.forEach((lesson) => {
      if (!lesson.subject_id) return;
      const key = lesson.subject_id;
      if (!map[key]) {
        map[key] = [];
        order.push(key);
      }
      map[key].push(lesson);
    });
    return { map, order };
  }, [lessons]);

  const subjectMap = useMemo(() => {
    const m: Record<string, SubjectItem> = {};
    subjects.forEach((s) => (m[s.id] = s));
    return m;
  }, [subjects]);

  // 현재 lesson이 속한 subject는 자동 펼침
  const currentSubjectId = useMemo(() => {
    const cur = lessons.find((l) => l.id === currentLessonId);
    return cur?.subject_id || 'uncategorized';
  }, [lessons, currentLessonId]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [currentSubjectId]: true,
  });

  const toggle = (subjectId: string) => {
    setExpanded((prev) => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  return (
    <aside className={styles.courseSidebar}>
      {/* 탭 헤더 */}
      <div className={styles.sidebarTabs}>
        <button
          type="button"
          className={`${styles.sidebarTab} ${activeTab === 'curriculum' ? styles.sidebarTabActive : ''}`}
          onClick={() => setActiveTab('curriculum')}
        >
          강의목차
        </button>
        <button
          type="button"
          className={`${styles.sidebarTab} ${activeTab === 'notes' ? styles.sidebarTabActive : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          노트
        </button>
        <button
          type="button"
          className={`${styles.sidebarTab} ${activeTab === 'community' ? styles.sidebarTabActive : ''}`}
          onClick={() => setActiveTab('community')}
        >
          커뮤니티
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className={styles.sidebarContent}>
        {activeTab === 'curriculum' && (
          <nav className={styles.curriculumNav}>
            {grouped.order.map((subjectId) => {
              const subjectLessons = grouped.map[subjectId] || [];
              const subjectTitle =
                subjectId === 'uncategorized' ? '기타' : subjectMap[subjectId]?.title || '과목';

              const totalSec = subjectLessons.reduce(
                (sum, l) => sum + (l.duration_seconds || 0),
                0
              );
              const publishedCount = subjectLessons.filter((l) => l.is_published).length;
              const completedCount = subjectLessons.filter((l) => completedLessonIds.has(l.id))
                .length;
              const isOpen = expanded[subjectId] ?? false;

              return (
                <div key={subjectId} className={styles.subjectBlock}>
                  <button
                    type="button"
                    className={styles.subjectRow}
                    onClick={() => toggle(subjectId)}
                  >
                    <div className={styles.subjectRowMain}>
                      <span className={styles.subjectRowTitle}>{subjectTitle}</span>
                      <span className={styles.subjectRowMeta}>
                        {totalSec > 0 && (
                          <span className={styles.subjectRowDuration}>
                            {formatDurationShort(totalSec)}
                          </span>
                        )}
                        <span className={styles.subjectRowProgress}>
                          {completedCount} / {publishedCount}
                        </span>
                      </span>
                    </div>
                    <span className={styles.subjectRowChevron}>
                      {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                    </span>
                  </button>

                  {isOpen && (
                    <ul className={styles.lessonList}>
                      {subjectLessons.map((lesson, index) => {
                        const isCompleted =
                          completedLessonIds.has(lesson.id) || liveCompleted.has(lesson.id);
                        const isCurrent = lesson.id === currentLessonId;
                        const availableAt = lesson.available_at
                          ? new Date(lesson.available_at)
                          : null;
                        const isScheduled = availableAt && availableAt > now;
                        const isLocked = isScheduled || !lesson.is_published;
                        const numStr = (index + 1).toString().padStart(2, '0');

                        if (isLocked) {
                          return (
                            <li
                              key={lesson.id}
                              className={`${styles.lessonRow} ${styles.lessonRowLocked}`}
                            >
                              <span className={styles.lessonRowIcon}>
                                <FaLock />
                              </span>
                              <span className={styles.lessonRowTitle}>
                                {numStr}. {lesson.title}
                              </span>
                              {lesson.duration_seconds ? (
                                <span className={styles.lessonRowDuration}>
                                  {formatDurationShort(lesson.duration_seconds)}
                                </span>
                              ) : null}
                            </li>
                          );
                        }

                        const serverPct = lessonProgressPercent?.[lesson.id] ?? 0;
                        const livePct = livePercent[lesson.id] ?? 0;
                        const percent = Math.min(99, Math.max(serverPct, livePct));
                        const showProgressBar = !isCompleted && percent > 0;

                        return (
                          <li key={lesson.id}>
                            <Link
                              href={`/lessons/${lesson.id}`}
                              className={`${styles.lessonRow} ${
                                isCurrent ? styles.lessonRowActive : ''
                              }`}
                            >
                              <span
                                className={`${styles.lessonRowIcon} ${
                                  isCompleted ? styles.lessonRowIconComplete : ''
                                } ${isCurrent ? styles.lessonRowIconCurrent : ''}`}
                              >
                                {isCurrent ? <FaPlay /> : isCompleted ? <FaCheck /> : <FaRegFileAlt />}
                              </span>
                              <span className={styles.lessonRowTitle}>
                                {numStr}. {lesson.title}
                              </span>
                              {!isCompleted && (
                                <span
                                  className={`${styles.lessonRowPercent} ${
                                    percent === 0 ? styles.lessonRowPercentZero : ''
                                  }`}
                                  aria-label={`${percent}% 시청`}
                                >
                                  {percent}%
                                </span>
                              )}
                              {lesson.duration_seconds ? (
                                <span className={styles.lessonRowDuration}>
                                  {formatDurationShort(lesson.duration_seconds)}
                                </span>
                              ) : null}
                              {showProgressBar && (
                                <span
                                  className={styles.lessonRowProgressBar}
                                  role="progressbar"
                                  aria-valuenow={percent}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  <span
                                    className={styles.lessonRowProgressFill}
                                    style={{ width: `${percent}%` }}
                                  />
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {activeTab === 'notes' && (
          <div className={styles.sidebarPlaceholder}>
            <p className={styles.placeholderTitle}>노트</p>
            <p className={styles.placeholderDesc}>강의를 들으며 작성한 노트가 여기 표시됩니다.</p>
          </div>
        )}

        {activeTab === 'community' && (
          <div className={styles.sidebarPlaceholder}>
            <p className={styles.placeholderTitle}>커뮤니티</p>
            <p className={styles.placeholderDesc}>
              수강생들의 질문과 토론이 여기 표시됩니다.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
