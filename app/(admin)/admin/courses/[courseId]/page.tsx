import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import CourseForm from '../CourseForm';
import CurriculumManager from '../components/CurriculumManager';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function EditCoursePage({ params }: PageProps) {
  const { courseId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error || !course) {
    notFound();
  }

  return (
    <CourseForm initialData={course}>
      <CurriculumManager courseId={courseId} />
    </CourseForm>
  );
}
