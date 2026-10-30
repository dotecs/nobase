import { notFound } from 'next/navigation';
import { requireLearner } from '@/lib/learn/runtime';
import { conceptCardData } from '@/lib/learn/lessons/data';
import { ConceptCard } from '@/components/learn/lesson/ConceptCard';
import { FocusShell } from '@/components/learn/FocusShell';
export const metadata={title:'개념 카드',robots:{index:false,follow:false}};
export default async function ConceptPage({params}:{params:Promise<{id:string}>}){await requireLearner();const {id}=await params;const data=await conceptCardData(id);if(!data)notFound();return <FocusShell title="개념 카드" tone="lesson"><ConceptCard data={data}/></FocusShell>;}
