import { redirect } from 'next/navigation';
import { createServerSupabaseClient, getUser, getProfile } from '@/lib/supabase-server';
import { ErrorPage } from '@/components';
import ConfirmClient from './ConfirmClient';
import { Course, Cohort, Profile } from '@/lib/database.types';

interface ConfirmPageProps {
  searchParams: Promise<{
    courseId?: string;
    cohortId?: string;
    hasEnrollment?: string;
  }>;
}

export default async function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const { courseId, cohortId, hasEnrollment } = await searchParams;

  if (!courseId || !cohortId) {
    return (
      <ErrorPage
        icon="link"
        title="잘못된 접근입니다"
        description="올바른 경로로 접근해 주세요."
        primaryAction={{
          label: '대시보드로 이동',
          href: '/dashboard',
        }}
      />
    );
  }

  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getProfile() as Profile | null;
  const supabase = await createServerSupabaseClient();

  // Course & Cohort 정보 조회
  const { data: courseData } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  const { data: cohortData } = await supabase
    .from('cohorts')
    .select('*')
    .eq('id', cohortId)
    .single();

  const course = courseData as Course | null;
  const cohort = cohortData as Cohort | null;

  if (!course || !cohort) {
    return (
      <ErrorPage
        icon="sad"
        title="정보를 찾을 수 없습니다"
        description="강좌 또는 기수 정보를 불러올 수 없습니다."
        primaryAction={{
          label: '대시보드로 이동',
          href: '/dashboard',
        }}
      />
    );
  }

  const isAlreadyEnrolled = hasEnrollment === 'true';

  return (
    <ConfirmClient
      user={{
        id: user.id,
        email: user.email || '',
        name: profile?.name || user.email || '',
      }}
      course={course}
      cohort={cohort}
      isAlreadyEnrolled={isAlreadyEnrolled}
    />
  );
}
