import 'next/headers';
import {lessonDb} from './data';
import {curriculumIds,type CurriculumView} from './curriculum';
import {packById} from './packs';
import {adminCurriculum,lessonStates} from './master';
/** 팩(content/packs)의 목차와, 그중 공개된 강의·이 사용자가 마친 강의. 팩이 없으면 undefined. */
export async function loadCurriculum(packId:string,userId:string|null):Promise<CurriculumView|undefined>{const root=packById(packId);if(!root)return undefined;const ids=curriculumIds(root);const client=lessonDb();const [lessons,events]=await Promise.all([client.from('learn_lessons').select('id').in('id',ids).in('status',['reviewed','live']),userId?client.from('learn_lesson_events').select('lesson_id').eq('user_id',userId).eq('type','complete').in('lesson_id',ids):Promise.resolve({data:[] as {lesson_id:string}[],error:null})]);if(lessons.error)throw lessons.error;if(events.error)throw events.error;return {curriculum:root,available:[...new Set((lessons.data??[]).map(r=>r.id))],completed:[...new Set((events.data??[]).map(r=>r.lesson_id))]};}

/** 관리자 미리보기용 목차: 팩에 없는 강의와 초안까지 모두. 링크는 미리보기(draft=1)로 이어진다. */
export async function loadAdminCurriculum(userId:string|null):Promise<CurriculumView>{const client=lessonDb();const [lessons,events]=await Promise.all([client.from('learn_lessons').select('id,version,title,kind,status'),userId?client.from('learn_lesson_events').select('lesson_id').eq('user_id',userId).eq('type','complete'):Promise.resolve({data:[] as {lesson_id:string}[],error:null})]);if(lessons.error)throw lessons.error;if(events.error)throw events.error;const states=lessonStates(lessons.data??[]);return {curriculum:adminCurriculum(states),available:states.map(state=>state.id),completed:[...new Set((events.data??[]).map(r=>r.lesson_id))],query:'draft=1'};}
