import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { FaBook, FaPlus, FaEdit } from 'react-icons/fa';
import { Button } from '@/components';
import { Course } from '@/lib/database.types';
import AdminPageHeader from '../AdminPageHeader';
import styles from '../admin.module.css';

export const dynamic = 'force-dynamic';

interface CourseWithCohorts extends Course {
  cohorts: { id: string }[];
}

export default async function AdminCoursesPage() {
  const supabase = await createServerSupabaseClient();

  const { data: coursesData } = await supabase
    .from('courses')
    .select(
      `
      *,
      cohorts (id)
    `,
    )
    .order('created_at', { ascending: false });

  const courses = (coursesData || []) as CourseWithCohorts[];

  return (
    <main className={styles.main}>
      <AdminPageHeader
        title="강좌 관리"
        description="강좌와 커리큘럼(과목·강의·자료)을 관리합니다"
        actions={
          <Button href="/admin/courses/new" size="sm">
            <FaPlus /> 새 강좌
          </Button>
        }
      />

      <div className={styles.courseSection}>
        {courses.length > 0 ? (
          <table className={styles.courseTable}>
            <thead>
              <tr>
                <th>강좌</th>
                <th>슬러그</th>
                <th>기수</th>
                <th>상태</th>
                <th>생성일</th>
                <th className={styles.thRight}>관리</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className={styles.rowLink}>
                  <td>
                    <Link href={`/admin/courses/${course.id}`} className={styles.courseInfo}>
                      <div className={styles.courseThumbnail}>
                        {course.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={course.thumbnail_url} alt={course.title} />
                        ) : (
                          <div className={styles.thumbnailPlaceholder}>
                            <FaBook />
                          </div>
                        )}
                      </div>
                      <span className={styles.courseTitle}>{course.title}</span>
                    </Link>
                  </td>
                  <td>
                    <span className={styles.courseSlug}>{course.slug}</span>
                  </td>
                  <td>{(course.cohorts as { id: string }[])?.length || 0}개</td>
                  <td>
                    <span className={`${styles.badge} ${course.is_published ? styles.published : styles.draft}`}>
                      {course.is_published ? '공개' : '비공개'}
                    </span>
                  </td>
                  <td>{new Date(course.created_at).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className={`${styles.actionBtn} ${styles.edit}`}
                        title="수정"
                      >
                        <FaEdit /> <span>수정</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FaBook />
            </div>
            <p>등록된 강좌가 없습니다</p>
            <Button href="/admin/courses/new" size="sm">
              <FaPlus /> 첫 강좌 만들기
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
