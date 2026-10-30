import Link from 'next/link';
import { lessonDb } from '@/lib/learn/lessons/data';
import { chooseTodayLesson } from '@/lib/learn/lessons/events';
import { runtimeError } from '@/lib/learn/runtime';
import styles from '@/app/(main)/learn/learn.module.css';
export async function TodayLessonCard({userId,packId,abilityIds}:{userId:string;packId:string;abilityIds:string[]}){
 if(!abilityIds.length)return null;
 try{const client=lessonDb();const rows=await client.from('learn_lessons').select('*').eq('pack_id',packId).in('status',['reviewed','live']).overlaps('ability_ids',abilityIds);if(rows.error)throw rows.error;
 const lesson=chooseTodayLesson(rows.data??[],abilityIds);if(!lesson)return null;
 const completed=await client.from('learn_lesson_events').select('id').eq('user_id',userId).eq('lesson_id',lesson.id).eq('lesson_version',lesson.version).eq('type','complete').limit(1);if(completed.error)throw completed.error;
 return <section className={styles.card}><h2>오늘의 레슨</h2><p>{lesson.title}</p><Link href={'/learn/lesson/'+lesson.id}>{completed.data?.length?'다시 보기':'레슨 보기'}</Link></section>;
 }catch(error){runtimeError(error,'lesson.homeCard');return null;}
}
