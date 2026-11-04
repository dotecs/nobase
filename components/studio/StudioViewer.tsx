'use client';
import {useLessonCompletion} from './useLessonCompletion';
import {ReferenceChip} from './ReferenceChip';
import {CourseSidebar} from './CourseSidebar';
import {nextLessonAction} from '@/lib/learn/lessons/curriculum';
import type {CurriculumView} from '@/lib/learn/lessons/curriculum';
import type {Alignment} from '@/lib/learn/lessons/alignment';
import { useEffect,useMemo,useState } from 'react';import type { Lesson } from '@/lib/learn/lessons/schema';import type { ConceptNode,ConceptEdge,LessonEvent } from '@/lib/learn/lessons/types';import type { ConceptLoader } from '@/components/learn/lesson/ConceptDialog';import { ConceptDialog } from '@/components/learn/lesson/ConceptDialog';import { ConceptTrace } from '@/components/learn/lesson/ConceptTrace';import { exploredState } from '@/lib/learn/lessons/stage-controls';
import {ChalkSurface} from './ChalkSurface';
import { StudioFrame } from './StudioFrame';
import StudioShell from './StudioShell';import StudioPlayer from './StudioPlayer';import { SceneNav } from './SceneNav';import { StudioComplete } from './StudioComplete';import { useSceneNavigation } from './useSceneNavigation';import { useLessonEvents } from './useLessonEvents';import { StudioStage } from './stages/StudioStage';import { StageControls } from './stages/StageControls';import { TraceDrawer } from './TraceDrawer';
const EMPTY_AUDIO:Record<string,string>={},EMPTY_DURATIONS:Record<string,number|null>={},EMPTY_GRAPH={nodes:[] as ConceptNode[],edges:[] as ConceptEdge[]};
export type StudioViewerProps={autoplayFirst?:boolean;admin?:boolean;referenceLessonId?:string;course?:CurriculumView;alignments?:Record<string,Alignment|null>;frame?:boolean;chrome?:boolean;lesson:Lesson;graph?:typeof EMPTY_GRAPH;audio?:Record<string,string>;durations?:Record<string,number|null>;record?:(events:LessonEvent[])=>Promise<{error?:string}>;loadConcept?:ConceptLoader;recordDuration?:(id:string,ms:number)=>Promise<unknown>;refreshAudio?:()=>Promise<Record<string,string>>;startPractice?:()=>Promise<{id?:string;error?:string;empty_reason?:string|null}>};
export function StudioViewer({lesson,course,alignments,graph=EMPTY_GRAPH,audio=EMPTY_AUDIO,durations=EMPTY_DURATIONS,record,loadConcept,recordDuration,startPractice,refreshAudio,frame=false,chrome=true,admin=false,referenceLessonId=lesson.id,autoplayFirst=false}:StudioViewerProps){
 const nav=useSceneNavigation(lesson.scenes),scene=lesson.scenes[nav.index],events=useLessonEvents(record),[theme,setTheme]=useState<'dark'|'light'>('dark'),[focused,setFocused]=useState(false),[captions,setCaptions]=useState(true),[manual,setManual]=useState<number|null>(null),[concept,setConcept]=useState<string|null>(null),[trace,setTrace]=useState<string|null>(null),[gaps,setGaps]=useState<string[]>([]),[notice,setNotice]=useState('');
 useEffect(()=>{setTrace(null);setConcept(null);setManual(null);},[scene.id]);
 const names=useMemo(()=>Object.fromEntries(graph.nodes.map(n=>[n.id,n.name])),[graph]);
 const emit=(event:LessonEvent)=>{events.emit(event);if(event.type==='gap'&&typeof event.payload.concept_id==='string'){const id=event.payload.concept_id;setGaps(old=>old.includes(id)?old:[...old,id]);}};
 const [autoplay,setAutoplay]=useState(autoplayFirst);
 const [autoAdvance,setAutoAdvance]=useState(false);
 useEffect(()=>{try{setAutoAdvance(window.localStorage.getItem('studio.autoAdvance')==='on');}catch{ /* Storage can be unavailable in private browsing. */ }},[]);
 const toggleAutoAdvance=()=>{
  const enabled=!autoAdvance;
  setAutoAdvance(enabled);
  try{window.localStorage.setItem('studio.autoAdvance',enabled?'on':'off');}catch{ /* The setting still works for this visit. */ }
 };
 const completion=useLessonCompletion(()=>{nav.markComplete();emit({type:'complete',payload:{scene_id:scene.id}});void events.flush();});
 const next=nextLessonAction(course,lesson.id);
 const shownCourse=course&&completion.completed?{...course,completed:[...new Set([...(course.completed??[]),lesson.id])]}:course;
 const [adminMode,setAdminMode]=useState(true);
 useEffect(()=>{try{if(window.localStorage.getItem('studio.adminMode')==='off')setAdminMode(false);}catch{ /* storage unavailable */ }},[]);
 const toggleAdminMode=()=>setAdminMode(value=>{const next=!value;try{window.localStorage.setItem('studio.adminMode',next?'on':'off');}catch{ /* ignore */ }return next;});
 const adminOn=admin&&adminMode;
 const move=(next:number)=>{setManual(null);setTrace(null);setConcept(null);setAutoplay(true);nav.move(next);};
 const finish=completion.show;
 const sceneEnded=()=>{
  if(nav.index===lesson.scenes.length-1)completion.onEnded();
  else if(autoAdvance)move(nav.index+1);
 };
 const proceed=async()=>{await events.flush();window.location.assign(next.href);};
 const practice=async()=>{if(!startPractice)return;setNotice('학습을 준비하고 있어요.');try{await events.flush();const result=await startPractice();if(result.id)window.location.assign('/learn/session/'+encodeURIComponent(result.id));else setNotice(result.error??'학습 홈에서 다음 학습을 확인해 주세요.');}catch{setNotice('학습을 시작하지 못했습니다. 다시 시도해 주세요.');}};
 return <StudioFrame enabled={frame}><StudioPlayer onSceneEnd={sceneEnded} autoplay={autoplay} referenceLessonId={adminOn&&chrome?referenceLessonId:undefined} key={scene.id} scene={scene} showCaptions={captions} onToggleCaptions={()=>setCaptions(value=>!value)} audioUrls={audio} alignments={alignments} durations={durations} worked={lesson.kind==='worked'} onEvent={emit} onDuration={recordDuration} refreshAudio={refreshAudio} onPrevious={()=>move(nav.index-1)} onNext={()=>nav.index===lesson.scenes.length-1?finish():move(nav.index+1)} onResume={()=>setManual(null)} onSeek={()=>setManual(null)}>
 {({state,sentenceStart,bar,caption,pause,seek,ended})=>{const display=exploredState(scene,state,manual),value=scene.stage.type==='slider'?display.params[scene.stage.param.name]:0;const explore=(value:number)=>{pause();seek(sentenceStart);setManual(value);};return <StudioShell adminMode={adminMode} onAdminModeChange={admin&&chrome?toggleAdminMode:undefined} frame={frame} chrome={chrome} focusMode={focused} onFocusChange={setFocused} theme={theme} onThemeChange={setTheme} scene={scene} reference={adminOn&&chrome?<ReferenceChip key={referenceLessonId+'#'+scene.id} lessonId={referenceLessonId} id={scene.id}/>:undefined} sidebar={close=><CourseSidebar lesson={lesson} index={nav.index} course={shownCourse} onSelectScene={next=>{if(next!==nav.index)move(next);close();}}/>} controls={['graph','slider'].includes(scene.stage.type)?<StageControls scene={scene} value={value} onGrab={()=>explore(value)} onExplore={explore}/>:undefined} stage={<ChalkStage scene={scene} state={display}><StudioStage scene={scene} state={display} conceptNames={names} openConcept={loadConcept?id=>{pause();setConcept(id);}:undefined} onWhy={id=>emit({type:'why_click',payload:{scene_id:scene.id,concept_id:id}})} onTrace={id=>{pause();setTrace(id);emit({type:'dontknow',payload:{scene_id:scene.id,concept_id:id}});}} onQuiz={(option_id,correct)=>emit({type:'quiz',payload:{scene_id:scene.id,option_id,correct}})}/></ChalkStage>} caption={caption} player={<>{bar}{events.notice&&<p role="status">{events.notice}</p>}</>} navigation={<SceneNav autoAdvance={autoAdvance} onToggleAutoAdvance={toggleAutoAdvance} completionLabel={next.label} player={<>{bar}{events.notice&&<p role="status">{events.notice}</p>}</>} scenes={lesson.scenes} index={nav.index} ended={ended} onMove={move} onComplete={()=>{pause();finish();}}/>} overlay={<><StudioComplete open={completion.open} seen={nav.seen.length} total={lesson.scenes.length} elapsed={nav.elapsed} gaps={gaps.map(id=>({id,name:names[id]??id}))} next={next} onClose={completion.close} onProceed={proceed} onPractice={startPractice?()=>void practice():undefined} notice={notice||events.notice}/>{concept&&loadConcept&&<ConceptDialog key={concept} id={concept} load={loadConcept} onClose={()=>setConcept(null)}/>}{trace&&<TraceDrawer onClose={()=>setTrace(null)}><ConceptTrace key={trace} start={trace} nodes={graph.nodes} edges={graph.edges} onEvent={emit} onClose={()=>setTrace(null)}/></TraceDrawer>}</>}/>;}}
 </StudioPlayer></StudioFrame>;
}

function ChalkStage({scene,state,children}:{scene:import('@/lib/learn/lessons/schema').Scene;state:import('@/lib/learn/lessons/stage-state').StageState;children:React.ReactNode}){return ['graph','slider'].includes(scene.stage.type)?children:<ChalkSurface scene={scene} state={state} marks={state.chalk??[]} revision={scene.id+JSON.stringify(state.revealed)}>{children}</ChalkSurface>;}
