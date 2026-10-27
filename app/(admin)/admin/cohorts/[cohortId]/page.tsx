import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import CohortForm from '../CohortForm';
import EndCohortEnrollments from './EndCohortEnrollments';
import { cohortEndFilter } from '@/lib/enrollment-status';

interface PageProps {
  params: Promise<{ cohortId: string }>;
}

export default async function EditCohortPage({ params }: PageProps) {
  const { cohortId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: cohort, error } = await supabase
    .from('cohorts')
    .select('*')
    .eq('id', cohortId)
    .single();

  if (error || !cohort) {
    notFound();
  }

  const filter = cohortEndFilter(cohortId);
  const { count, error: countError } = await supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('cohort_id', filter.cohort_id).eq('status', filter.status);
  return <><CohortForm initialData={cohort} /><EndCohortEnrollments cohortId={cohortId} title={(cohort as { title: string }).title} activeCount={countError ? null : count} /></>;
}
