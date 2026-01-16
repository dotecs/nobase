import Link from 'next/link';
import styles from './CourseCard.module.css';

interface CourseCardProps {
  courseId: string;
  cohortId: string;
  courseTitle: string;
  cohortTitle: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  totalLessons: number;
  completedLessons: number;
  nextLessonId?: string | null;
}

export default function CourseCard({
  courseId,
  cohortId,
  courseTitle,
  cohortTitle,
  description,
  thumbnailUrl,
  totalLessons,
  completedLessons,
  nextLessonId,
}: CourseCardProps) {
  const progressPercent = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0;

  const courseUrl = `/courses/${courseId}/cohorts/${cohortId}`;

  return (
    <div className={`${styles.card} ${styles.courseCard}`}>
      <Link href={courseUrl}>
        <div className={styles.thumbnail}>
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={courseTitle}
              className={styles.thumbnailImage}
            />
          ) : (
            <FaBook className={styles.thumbnailIcon} />
          )}
        </div>
      </Link>

      <div className={styles.content}>
        <span className={styles.cohortBadge}>
          <FaCalendarAlt /> {cohortTitle}
        </span>
        <Link href={courseUrl}>
          <h3 className={styles.title}>{courseTitle}</h3>
        </Link>
        {description && (
          <p className={styles.description}>{description}</p>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={styles.progressText}>
            {completedLessons}/{totalLessons} 완료 ({progressPercent}%)
          </span>
        </div>

        {nextLessonId && (
          <Link 
            href={`/lessons/${nextLessonId}`}
            className={styles.continueButton}
          >
            이어보기 →
          </Link>
        )}
      </div>
    </div>
  );
}
