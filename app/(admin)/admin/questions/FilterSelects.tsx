'use client';

import { useRouter } from 'next/navigation';
import { FaBook, FaPlay } from 'react-icons/fa';
import styles from './questions.module.css';

interface FilterSelectsProps {
  status: string;
  courseId?: string;
  lessonId?: string;
  courses: { id: string; title: string }[];
  lessons: { id: string; title: string }[];
}

export default function FilterSelects({
  status,
  courseId,
  lessonId,
  courses,
  lessons,
}: FilterSelectsProps) {
  const router = useRouter();

  const handleCourseChange = (newCourseId: string) => {
    const url = `/admin/questions?status=${status}${newCourseId ? `&courseId=${newCourseId}` : ''}`;
    router.push(url);
  };

  const handleLessonChange = (newLessonId: string) => {
    const url = `/admin/questions?status=${status}&courseId=${courseId}${newLessonId ? `&lessonId=${newLessonId}` : ''}`;
    router.push(url);
  };

  return (
    <>
      <div className={styles.filterGroup}>
        <label><FaBook /> 강좌</label>
        <select
          className={styles.filterSelect}
          value={courseId || ''}
          onChange={(e) => handleCourseChange(e.target.value)}
        >
          <option value="">전체 강좌</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {courseId && lessons.length > 0 && (
        <div className={styles.filterGroup}>
          <label><FaPlay /> 레슨</label>
          <select
            className={styles.filterSelect}
            value={lessonId || ''}
            onChange={(e) => handleLessonChange(e.target.value)}
          >
            <option value="">전체 레슨</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
