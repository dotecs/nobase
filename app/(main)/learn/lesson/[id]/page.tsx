import {loadCurriculum} from '@/lib/learn/lessons/curriculum-server';
import { notFound, redirect } from 'next/navigation';
import { requireLearnerAccess } from '@/lib/learn/runtime';import { publishedLesson,audioPlayback,conceptGraph } from '@/lib/learn/lessons/data';import { StudioViewer } from '@/components/studio/StudioViewer';import { loadStudioTheme } from '@/lib/learn/user-settings';import { saveLessonTheme,recordLessonEvents,refreshLessonAudio,recordLessonAudioDuration,loadConceptCard } from '../actions';import { startSession } from '../../actions';
import { lessonViewer, lessonLoginHref, nextNeedsLogin, COACHING_CTA } from '@/lib/learn/lessons/free-access';
export const metadata={title:'러닝 스튜디오',robots:{index:false,follow:false}};
export default async function LessonPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{frame?:string;chrome?:string;autoplay?:string}>}){
  const {id}=await params,viewer=await lessonViewer(id);
  if(viewer.kind==='login')redirect(lessonLoginHref(id));
  if(viewer.kind==='denied')await requireLearnerAccess(); // 기존 안내문(코칭 과정 등록 후 이용)을 그대로 보여 준다
  const row=await publishedLesson(id);if(!row)notFound();
  const userId=viewer.kind==='full'||viewer.kind==='free'?viewer.userId:null,full=viewer.kind==='full';
  const [audio,graph,query,course,theme]=await Promise.all([audioPlayback(id,row.version),conceptGraph(row.pack_id),searchParams,loadCurriculum(row.pack_id,userId),userId?loadStudioTheme(userId):null]);
  return <StudioViewer key={row.id+':'+row.version} initialTheme={theme??undefined} saveTheme={userId?saveLessonTheme:undefined} autoplayFirst={query.autoplay==='1'} admin={full&&viewer.admin} course={course} lesson={row.body} graph={graph} audio={audio.urls} alignments={audio.alignments} durations={audio.durations} record={userId?recordLessonEvents.bind(null,id,row.version):undefined} refreshAudio={refreshLessonAudio.bind(null,id,row.version)} recordDuration={recordLessonAudioDuration.bind(null,id,row.version)} loadConcept={loadConceptCard} startPractice={full?startSession:undefined} cta={full?undefined:COACHING_CTA} guest={viewer.kind==='guest'&&nextNeedsLogin(id)} frame={query.frame==='16x9'} chrome={query.chrome!=='0'}/>;
}
