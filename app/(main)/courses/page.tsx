import { Suspense } from 'react';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { Header } from '@/components';
import type { Profile } from '@/lib/database.types';
import { getPrograms } from '@/lib/programs';
import { getProgramEnrollment } from '@/lib/program-enrollment';
import { normalizeCategory } from '@/content/programs';
import { home } from '@/content/home';
import ProgramExplorer from '@/components/ProgramExplorer/ProgramExplorer';
import styles from './courses.module.css';

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const [user, profileData, programs, params] = await Promise.all([getUser(), getProfile(), getPrograms(), searchParams]);
  const profile = profileData as Profile | null;
  const enrolledHrefs: Record<string, string> = {};
  if (user) {
    const supabase = await createServerSupabaseClient();
    const { data: enrollments, error } = await supabase.from('enrollments').select('cohort_id').eq('user_id', user.id).eq('status', 'active');
    if (error) throw error;
    const enrolledCohortIds = ((enrollments ?? []) as { cohort_id: string }[]).map(entry => entry.cohort_id);
    if (enrolledCohortIds.length) {
      const { data: rows, error: cohortError } = await supabase.from('cohorts').select('id, course_id').in('id', enrolledCohortIds).order('created_at', { ascending: false });
      if (cohortError) throw cohortError;
      const cohorts = (rows ?? []) as { id: string; course_id: string }[];
      for (const program of programs) {
        if (!program.courseId) continue;
        const enrollment = getProgramEnrollment(program.courseId, cohorts, enrolledCohortIds);
        if (enrollment) enrolledHrefs[program.courseId] = enrollment.href;
      }
    }
  }
  return <div className={styles.page}>
    <Header userName={profile?.name || user?.email} isLoggedIn={!!user} userRole={profile?.role} />
    <main className={styles.main}>
      <div className={styles.header}><h1 className={styles.title}>{home.programs.catalogTitle}</h1><p className={styles.subtitle}>{home.programs.subtitle}</p></div>
      <Suspense><ProgramExplorer programs={programs} syncUrl initialCategory={normalizeCategory(params.category)} enrolledHrefs={enrolledHrefs} /></Suspense>
    </main>
  </div>;
}
