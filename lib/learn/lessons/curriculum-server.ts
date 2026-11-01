import 'next/headers';
import root from '@/content/curricula/root-math.json';
import {lessonDb} from './data';
import {curriculumIds,type CurriculumView} from './curriculum';
export async function loadCurriculum(packId:string):Promise<CurriculumView|undefined>{if(packId!==root.id)return undefined;const ids=curriculumIds(root);const {data,error}=await lessonDb().from('learn_lessons').select('id').in('id',ids).in('status',['reviewed','live']);if(error)throw error;return {curriculum:root,available:[...new Set((data??[]).map(r=>r.id))]};}
