import Link from 'next/link';
import { lessonDb } from '@/lib/learn/lessons/data';
import { summarizeLessonActivity } from '@/lib/learn/lessons/events';
import { requireCoach,runtimeError } from '@/lib/learn/runtime';
export async function CoachLessonActivity({userId}:{userId:string}){
 try{await requireCoach();const {data,error}=await lessonDb().from('learn_lesson_events').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(500);if(error)throw error;
 const rows=summarizeLessonActivity(data??[]);return <section><h2>레슨 활동</h2><p>최근 활동 500건 기준 · 퀴즈는 학습 판정에 반영하지 않습니다.</p>{!rows.length&&<p>아직 레슨 활동이 없습니다.</p>}<ul>{rows.map(row=><li key={row.id+row.version}><Link href={'/learn/lesson/'+row.id}>{row.id}</Link> v{row.version} · {row.completed?'완료':'시청 중'} · {row.seconds}초 · 근거 확인 {row.why}회{row.gaps.length>0&&<p>확인할 개념: {row.gaps.map(id=><Link key={id} href={'/learn/concept/'+id}>{id} </Link>)}</p>}</li>)}</ul></section>;
 }catch(error){return <section><h2>레슨 활동</h2><p>{runtimeError(error,'lesson.coachActivity')}</p></section>;}
}
