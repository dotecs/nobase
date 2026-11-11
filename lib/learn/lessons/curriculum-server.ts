import 'next/headers';
import root from '@/content/curricula/root-math.json';
import {lessonDb} from './data';
import {curriculumIds,type CurriculumView} from './curriculum';
export async function loadCurriculum(packId:string,userId:string|null):Promise<CurriculumView|undefined>{if(packId!==root.id)return undefined;const ids=curriculumIds(root);const client=lessonDb();const [lessons,events]=await Promise.all([client.from('learn_lessons').select('id').in('id',ids).in('status',['reviewed','live']),userId?client.from('learn_lesson_events').select('lesson_id').eq('user_id',userId).eq('type','complete').in('lesson_id',ids):Promise.resolve({data:[] as {lesson_id:string}[],error:null})]);if(lessons.error)throw lessons.error;if(events.error)throw events.error;return {curriculum:root,available:[...new Set((lessons.data??[]).map(r=>r.id))],completed:[...new Set((events.data??[]).map(r=>r.lesson_id))]};}
