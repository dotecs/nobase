import {loadCurriculum,loadAdminCurriculum} from '@/lib/learn/lessons/curriculum-server';
import { notFound, redirect } from 'next/navigation';
import { requireLearnerAccess } from '@/lib/learn/runtime';import { publishedLesson,audioPlayback,conceptGraph } from '@/lib/learn/lessons/data';import { StudioViewer } from '@/components/studio/StudioViewer';import { loadStudioTheme } from '@/lib/learn/user-settings';import { saveLessonTheme,recordLessonEvents,refreshLessonAudio,recordLessonAudioDuration,loadConceptCard } from '../actions';import { startSession } from '../../actions';
import { packForLesson } from '@/lib/learn/lessons/packs';
import { resolveLessonRefs } from '@/lib/learn/lessons/lesson-refs';
import { originalVideoUrl } from '@/lib/learn/lessons/free-materials';
import { vimeoEmbedUrl } from '@/lib/video-embed';
import { lessonViewer, lessonLoginHref, nextNeedsLogin, COACHING_CTA } from '@/lib/learn/lessons/free-access';
export const metadata={title:'러닝 스튜디오',robots:{index:false,follow:false}};
export default async function LessonPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{frame?:string;chrome?:string;autoplay?:string;video?:string;pack?:string;draft?:string}>}){
  const {id}=await params,query=await searchParams,viewer=await lessonViewer(id);
  if(viewer.kind==='login')redirect(lessonLoginHref(id));
  if(viewer.kind==='denied')await requireLearnerAccess(); // 기존 안내문(코칭 과정 등록 후 이용)을 그대로 보여 준다
  if(viewer.kind==='hidden')notFound(); // 어느 팩에도 없는 강의는 학습자에게 없는 강의다
  // 관리자는 ?draft=1 로 아직 공개하지 않은 최신 판(초안 포함)을 미리 본다. 미리보기는 시청 기록을 남기지 않는다.
  const draft=viewer.kind==='full'&&viewer.admin&&query.draft==='1';
  const row=await publishedLesson(id,undefined,draft);if(!row)notFound();
  // 강 번호와 목차는 보는 팩이 정한다. ?pack= 으로 고르고, 없으면 이 강의가 든 첫 팩.
  const pack=packForLesson(id,query.pack);
  const userId=viewer.kind==='full'||viewer.kind==='free'?viewer.userId:null,full=viewer.kind==='full';
  // 관리자가 미리보기 중이거나 팩에 없는 강의를 보면, 목차에 팩 밖 강의와 초안까지 모두 보여 준다.
  const adminAll=full&&viewer.admin&&(draft||!pack);
  const title=pack?.chapters.flatMap(ch=>ch.items).find(item=>item.lesson_id===id)?.title;
  const [audio,graph,course,theme,videoUrl]=await Promise.all([audioPlayback(id,row.version,draft),conceptGraph(row.pack_id),adminAll?loadAdminCurriculum(userId):pack?loadCurriculum(pack.id,userId):undefined,userId?loadStudioTheme(userId):null,title?originalVideoUrl(title):null]);
  return <StudioViewer key={row.id+':'+row.version} initialTheme={theme??undefined} saveTheme={userId?saveLessonTheme:undefined} autoplayFirst={query.autoplay==='1'} admin={full&&viewer.admin} course={course} lesson={resolveLessonRefs(row.body,pack)} graph={graph} audio={audio.urls} alignments={audio.alignments} durations={audio.durations} record={userId&&!draft?recordLessonEvents.bind(null,id,row.version):undefined} refreshAudio={refreshLessonAudio.bind(null,id,row.version)} recordDuration={recordLessonAudioDuration.bind(null,id,row.version)} loadConcept={loadConceptCard} startPractice={full?startSession:undefined} cta={full?undefined:COACHING_CTA} guest={viewer.kind==='guest'&&nextNeedsLogin(id)} video={title&&videoUrl?{title,src:vimeoEmbedUrl(videoUrl),open:query.video==='1'}:undefined} frame={query.frame==='16x9'} chrome={query.chrome!=='0'}/>;
}
