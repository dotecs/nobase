'use client';
import {useEffect,useMemo,useState} from 'react';
import {usePortrait} from './StageLayout';
import {PortraitSurface} from './PortraitSurface';
import {useLessonCompletion} from './useLessonCompletion';
import {ReferenceChip} from './ReferenceChip';
import {CourseSidebar} from './CourseSidebar';
import {nextLessonAction,type CurriculumView} from '@/lib/learn/lessons/curriculum';
import {lessonClock,sceneNeedsContinue,sceneTitle} from '@/lib/learn/lessons/lesson-clock';
import type {Alignment} from '@/lib/learn/lessons/alignment';
import type {Lesson} from '@/lib/learn/lessons/schema';
import type {ConceptNode,ConceptEdge,LessonEvent} from '@/lib/learn/lessons/types';
import type {ConceptLoader} from '@/components/learn/lesson/ConceptDialog';
import {ConceptDialog} from '@/components/learn/lesson/ConceptDialog';
import {ConceptTrace} from '@/components/learn/lesson/ConceptTrace';
import {exploredState} from '@/lib/learn/lessons/stage-controls';
import {ChalkSurface} from './ChalkSurface';
import {StudioFrame} from './StudioFrame';
import StudioShell from './StudioShell';
import StudioPlayer from './StudioPlayer';
import {LessonNavigation} from './LessonNavigation';
import {LessonContents} from './LessonContents';
import {StudioComplete} from './StudioComplete';
import {useLessonNavigation} from './useLessonNavigation';
import {useLessonEvents} from './useLessonEvents';
import {StudioStage} from './stages/StudioStage';
import {StageControls} from './stages/StageControls';
import {TraceDrawer} from './TraceDrawer';
const EMPTY_AUDIO:Record<string,string>={},EMPTY_DURATIONS:Record<string,number|null>={},EMPTY_GRAPH={nodes:[] as ConceptNode[],edges:[] as ConceptEdge[]};
export type StudioViewerProps={autoplayFirst?:boolean;admin?:boolean;referenceLessonId?:string;course?:CurriculumView;alignments?:Record<string,Alignment|null>;frame?:boolean;chrome?:boolean;lesson:Lesson;graph?:typeof EMPTY_GRAPH;audio?:Record<string,string>;durations?:Record<string,number|null>;record?:(events:LessonEvent[])=>Promise<{error?:string}>;loadConcept?:ConceptLoader;recordDuration?:(id:string,ms:number)=>Promise<unknown>;refreshAudio?:()=>Promise<Record<string,string>>;startPractice?:()=>Promise<{id?:string;error?:string;empty_reason?:string|null}>};

export function StudioViewer(props:StudioViewerProps){return <LessonViewer key={props.lesson.id} {...props}/>;}

function LessonViewer({lesson,course,alignments,graph=EMPTY_GRAPH,audio=EMPTY_AUDIO,durations=EMPTY_DURATIONS,record,loadConcept,recordDuration,startPractice,refreshAudio,frame=false,chrome=true,admin=false,referenceLessonId=lesson.id,autoplayFirst=false}:StudioViewerProps){
  const [measured,setMeasured]=useState<Record<string,number>>({});
  const known=useMemo(()=>({...durations,...measured}),[durations,measured]);
  const clock=useMemo(()=>lessonClock(lesson,known),[lesson,known]);
  const nav=useLessonNavigation(lesson,clock,autoplayFirst),index=nav.cursor.index,scene=lesson.scenes[index],events=useLessonEvents(record);
  const [theme,setTheme]=useState<'dark'|'light'>('dark'),[focused,setFocused]=useState(false),[captions,setCaptions]=useState(true),[manual,setManual]=useState<number|null>(null),[concept,setConcept]=useState<string|null>(null),[trace,setTrace]=useState<string|null>(null),[gaps,setGaps]=useState<string[]>([]),[notice,setNotice]=useState('');
  const [waiting,setWaiting]=useState(false),[answered,setAnswered]=useState(false),[sceneBar,setSceneBar]=useState(false);
  useEffect(()=>{setTrace(null);setConcept(null);setManual(null);setWaiting(false);setAnswered(false);},[scene.id]);
  const names=useMemo(()=>Object.fromEntries(graph.nodes.map(n=>[n.id,n.name])),[graph]);
  const emit=(event:LessonEvent)=>{events.emit(event);if(event.type==='gap'&&typeof event.payload.concept_id==='string'){const id=event.payload.concept_id;setGaps(old=>old.includes(id)?old:[...old,id]);}};
  const [autoAdvance,setAutoAdvance]=useState(false);
  useEffect(()=>{try{setAutoAdvance(localStorage.getItem('studio.autoNextLesson')==='on');}catch{}},[]);
  const toggleAutoAdvance=()=>{const enabled=!autoAdvance;setAutoAdvance(enabled);try{localStorage.setItem('studio.autoNextLesson',enabled?'on':'off');}catch{}};
  const completion=useLessonCompletion(()=>{nav.markComplete();emit({type:'complete',payload:{scene_id:scene.id}});void events.flush();});
  const next=nextLessonAction(course,lesson.id);
  const shownCourse=course&&completion.completed?{...course,completed:[...new Set([...(course.completed??[]),lesson.id])]}:course;
  const [adminMode,setAdminMode]=useState(true);
  useEffect(()=>{try{if(localStorage.getItem('studio.adminMode')==='off')setAdminMode(false);}catch{}},[]);
  const toggleAdminMode=()=>setAdminMode(value=>{const next=!value;try{localStorage.setItem('studio.adminMode',next?'on':'off');}catch{}return next;});
  const adminOn=admin&&adminMode;
  const move=(target:number)=>{if(target<0||target>=lesson.scenes.length)return;setWaiting(false);setManual(null);nav.navigate(clock.sceneStarts[target],true);};
  const continueLesson=()=>{setWaiting(false);if(index===lesson.scenes.length-1)completion.onEnded();else move(index+1);};
  const sceneEnded=()=>{nav.markScene();if(sceneNeedsContinue(scene)&&!answered)setWaiting(true);else continueLesson();};
  const seekLesson=(time:number,playing:boolean)=>{setWaiting(false);setManual(null);nav.navigate(time,playing);};
  const proceed=async()=>{nav.save();await events.flush();window.location.assign(next.href);};
  const practice=async()=>{if(!startPractice)return;setNotice('학습을 준비하고 있어요.');try{await events.flush();const result=await startPractice();if(result.id)window.location.assign('/learn/session/'+encodeURIComponent(result.id));else setNotice(result.error??'학습 홈에서 다음 학습을 확인해 주세요.');}catch{setNotice('학습을 시작하지 못했습니다. 다시 시도해 주세요.');}};
  return <StudioFrame enabled={frame}><StudioPlayer key={scene.id+':'+nav.ready} scene={scene} initialTime={nav.cursor.local} seekRequest={nav.cursor} autoplay={nav.ready&&nav.cursor.autoplay} autoplayDelay={nav.phase==='in'?120:0}
    onSceneEnd={sceneEnded} onProgress={(local)=>{if(nav.ready)nav.progress(index,local);}} onKnownDuration={(id,ms)=>setMeasured(old=>({...old,[id]:ms}))}
    transport={adminOn&&sceneBar?undefined:{time:nav.time,total:clock.total,chapters:lesson.scenes.map((s,i)=>({title:sceneTitle(s),time:clock.sceneStarts[i]})),onSeek:seekLesson}}
    referenceLessonId={adminOn&&chrome?referenceLessonId:undefined} showCaptions={captions} onToggleCaptions={()=>setCaptions(value=>!value)} audioUrls={audio} alignments={alignments} durations={known} worked={lesson.kind==='worked'} onEvent={nav.ready?emit:undefined} onDuration={recordDuration} refreshAudio={refreshAudio}
    onPrevious={()=>adminOn?move(index-1):seekLesson(nav.time-5000,true)} onNext={()=>adminOn?(index===lesson.scenes.length-1?completion.show():move(index+1)):seekLesson(nav.time+5000,true)} onResume={()=>{setManual(null);if(nav.time>=clock.total)seekLesson(0,true);}} onSeek={()=>setManual(null)}>
    {({state,sentenceStart,bar,caption,pause,seek,ended})=>{
      const explored=exploredState(scene,state,manual),display=nav.phase?{...explored,suppressMoves:true,chalk:[],callouts:[],regions:[],tints:{},tintOpacity:{},highlight:null,highlightOpacity:0,dimOthers:false,pulses:{}}:explored;
      const value=scene.stage.type==='slider'?display.params[scene.stage.param.name]:0;
      const explore=(value:number)=>{pause();seek(sentenceStart);setManual(value);};
      const player=<>{bar}{events.notice&&<p role="status">{events.notice}</p>}</>;
      return <StudioShell lessonTitle={lesson.title} contents={<LessonContents scenes={lesson.scenes} index={index} completed={nav.completed} onSelect={target=>{pause();move(target);}}/>} transition={nav.phase}
        adminMode={adminMode} onAdminModeChange={admin&&chrome?toggleAdminMode:undefined} frame={frame} chrome={chrome} focusMode={focused} onFocusChange={setFocused} theme={theme} onThemeChange={setTheme} scene={scene}
        reference={adminOn&&chrome?<ReferenceChip key={referenceLessonId+'#'+scene.id} lessonId={referenceLessonId} id={scene.id}/>:undefined}
        sidebar={<CourseSidebar lesson={lesson} course={shownCourse} time={nav.time} total={clock.total}/>}
        controls={['graph','slider'].includes(scene.stage.type)?<StageControls scene={scene} value={value} onGrab={()=>explore(value)} onExplore={explore}/>:undefined}
        stage={<ChalkStage scene={scene} state={display}><StudioStage scene={scene} state={display} conceptNames={names} openConcept={loadConcept?id=>{pause();setConcept(id);}:undefined}
          onWhy={id=>emit({type:'why_click',payload:{scene_id:scene.id,concept_id:id}})} onTrace={id=>{pause();setTrace(id);emit({type:'dontknow',payload:{scene_id:scene.id,concept_id:id}});}}
          onQuiz={(option_id,correct)=>{emit({type:'quiz',payload:{scene_id:scene.id,option_id,correct}});if(correct){setAnswered(true);if(waiting||ended)continueLesson();}}}/></ChalkStage>}
        caption={caption} player={player}
        navigation={<LessonNavigation admin={adminOn} sceneBar={sceneBar} onScope={()=>setSceneBar(value=>!value)} autoAdvance={autoAdvance} onToggleAutoAdvance={toggleAutoAdvance} completionLabel={next.label} player={player} scenes={lesson.scenes} index={index} ended={ended} waiting={waiting||(ended&&sceneNeedsContinue(scene))} onContinue={continueLesson} onMove={target=>{pause();move(target);}} onComplete={()=>{pause();completion.show();}}/>}
        overlay={<><StudioComplete lessonProgress={adminOn?undefined:nav.time/clock.total} autoNext={autoAdvance} open={completion.open} seen={nav.completed.length} total={lesson.scenes.length} elapsed={nav.elapsed} gaps={gaps.map(id=>({id,name:names[id]??id}))} next={next} onClose={completion.close} onProceed={proceed} onPractice={startPractice?()=>void practice():undefined} notice={notice||events.notice}/>{concept&&loadConcept&&<ConceptDialog key={concept} id={concept} load={loadConcept} onClose={()=>setConcept(null)}/>}{trace&&<TraceDrawer onClose={()=>setTrace(null)}><ConceptTrace key={trace} start={trace} nodes={graph.nodes} edges={graph.edges} onEvent={emit} onClose={()=>setTrace(null)}/></TraceDrawer>}</>}/>;
    }}
  </StudioPlayer></StudioFrame>;
}

function ChalkStage({scene,state,children}:{scene:import('@/lib/learn/lessons/schema').Scene;state:import('@/lib/learn/lessons/stage-state').StageState;children:React.ReactNode}){const portrait=usePortrait();if(portrait&&scene.stage.type!=='figure')return <PortraitSurface scene={scene} state={state}>{children}</PortraitSurface>;return ['graph','slider'].includes(scene.stage.type)?children:<ChalkSurface scene={scene} state={state} marks={state.chalk??[]} revision={scene.id+JSON.stringify(state.revealed)}>{children}</ChalkSurface>;}
