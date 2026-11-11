import { notFound, redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { conceptCardData } from '@/lib/learn/lessons/data';
import { ConceptCard } from '@/components/learn/lesson/ConceptCard';
import { FocusShell } from '@/components/learn/FocusShell';
export const metadata={title:'개념 카드',robots:{index:false,follow:false}};
export default async function ConceptPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const {data:{user}}=await (await createServerSupabaseClient()).auth.getUser();if(!user)redirect('/login?returnTo='+encodeURIComponent('/learn/concept/'+id));const data=await conceptCardData(id);if(!data)notFound();return <FocusShell title="개념 카드" tone="lesson"><ConceptCard data={data}/></FocusShell>;}
