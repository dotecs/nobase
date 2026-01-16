import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import CohortForm from '../CohortForm';

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

  return <CohortForm initialData={cohort} />;
}
