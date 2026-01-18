import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { FaBook, FaUsers, FaGraduationCap, FaBullhorn, FaEdit, FaUserShield, FaUser } from 'react-icons/fa';
import { Profile } from '@/lib/database.types';
import styles from '../admin.module.css';

interface UserWithEnrollments extends Profile {
  enrollments: { id: string }[];
}

export default async function UsersPage() {
  const supabase = await createServerSupabaseClient();

  // 통계 데이터 조회
  const [
    { count: courseCount },
    { count: cohortCount },
    { count: enrollmentCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('cohorts').select('*', { count: 'exact', head: true }),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  // 사용자 목록 조회
  const { data: usersData } = await supabase
    .from('profiles')
    .select(`
      *,
      enrollments (id)
    `)
    .order('created_at', { ascending: false });

  const users = (usersData || []) as UserWithEnrollments[];

  return (
    <main className={styles.main}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>관리자 대시보드</h1>
          <p>강좌, 기수, 사용자를 관리합니다</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaBook />
          </div>
          <div className={styles.statInfo}>
            <h3>{courseCount || 0}</h3>
            <p>전체 강좌</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaGraduationCap />
          </div>
          <div className={styles.statInfo}>
            <h3>{cohortCount || 0}</h3>
            <p>전체 기수</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaUsers />
          </div>
          <div className={styles.statInfo}>
            <h3>{enrollmentCount || 0}</h3>
            <p>수강 등록</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FaBullhorn />
          </div>
          <div className={styles.statInfo}>
            <h3>{userCount || 0}</h3>
            <p>전체 사용자</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <Link href="/admin" className={styles.tab}>
          강좌 관리
        </Link>
        <Link href="/admin/cohorts" className={styles.tab}>
          기수 관리
        </Link>
        <Link href="/admin/enrollments" className={styles.tab}>
          수강신청 관리
        </Link>
        <Link href="/admin/users" className={`${styles.tab} ${styles.active}`}>
          사용자 관리
        </Link>
      </div>

      {/* User List */}
      <div className={styles.courseSection}>
        <div className={styles.sectionHeader}>
          <h2>사용자 목록</h2>
        </div>

        {users && users.length > 0 ? (
          <table className={styles.courseTable}>
            <thead>
              <tr>
                <th>사용자</th>
                <th>역할</th>
                <th>수강 현황</th>
                <th>가입일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td>
                    <div className={styles.courseInfo}>
                      <div className={styles.courseThumbnail} style={{ borderRadius: '50%' }}>
                        <div className={styles.thumbnailPlaceholder}>
                          {user.role === 'admin' ? <FaUserShield /> : <FaUser />}
                        </div>
                      </div>
                      <div>
                        <span className={styles.courseTitle}>{user.name || '이름 없음'}</span>
                        <div className={styles.courseSlug}>{user.user_id.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${user.role === 'admin' ? styles.published : styles.draft}`}>
                      {user.role === 'admin' ? '관리자' : '학생'}
                    </span>
                  </td>
                  <td>{(user.enrollments as any[])?.length || 0}개 강좌</td>
                  <td>{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link 
                        href={`/admin/users/${user.user_id}`} 
                        className={`${styles.actionBtn} ${styles.edit}`}
                        title="상세보기"
                      >
                        <FaEdit />
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
              <FaUsers />
            </div>
            <p>등록된 사용자가 없습니다</p>
          </div>
        )}
      </div>
    </main>
  );
}
