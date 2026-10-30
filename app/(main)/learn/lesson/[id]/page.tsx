import { notFound } from 'next/navigation';
import { requireLearner } from '@/lib/learn/runtime';
import { publishedLesson,audioUrls,conceptGraph } from '@/lib/learn/lessons/data';
import { LessonViewer } from '@/components/learn/lesson/LessonViewer';
import { recordLessonEvents,refreshLessonAudio,loadConceptCard } from '../actions';
export const metadata={title:'시각 레슨',robots:{index:false,follow:false}};
export default async function LessonPage({params}:{params:Promise<{id:string}>}){
 await requireLearner();const {id}=await params;const row=await publishedLesson(id);if(!row)notFound();
 return <LessonViewer lesson={row.body} graph={await conceptGraph(row.pack_id)} audio={await audioUrls(id,row.version)} record={recordLessonEvents.bind(null,id,row.version)} refreshAudio={refreshLessonAudio.bind(null,id,row.version)} loadConcept={loadConceptCard}/>;
}
