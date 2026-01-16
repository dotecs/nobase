import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import UserDetail from '../UserDetail';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !user) {
    notFound();
  }

  // 수강 정보 조회
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      status,
      cohort:cohorts (
        id,
        title,
        course:courses (
          id,
          title
        )
      )
    `)
    .eq('user_id', userId);

  const formattedEnrollments = (enrollments || []).map((e: any) => ({
    id: e.id,
    status: e.status,
    cohort: {
      id: e.cohort.id,
      title: e.cohort.title,
      course: {
        id: e.cohort.course.id,
        title: e.cohort.course.title,
      },
    },
  }));

  return <UserDetail user={user} enrollments={formattedEnrollments} />;
}
