import { requireCoach, runtimeError } from '@/lib/learn/runtime';
import { lessonDb } from '@/lib/learn/lessons/data';
import { buildCatalog, lessonStates } from '@/lib/learn/lessons/master';
import { PACKS, packLessonIds } from '@/lib/learn/lessons/packs';
import { CurriculumTree } from './CurriculumTree';
import styles from './curriculum.module.css';

export const metadata = { title: '전체 커리큘럼', robots: { index: false, follow: false } };
const ACCESS = { free: '무료', enrolled: '수강생' } as const;

/** 수학 전 과목의 과목 → 대단원 → 소단원 → 강의 트리. 강 번호는 팩이 정하고, 학습자에게는 팩에 든 강의만 보인다. */
export default async function CurriculumPage() {
  try {
    await requireCoach();
    const rows = await lessonDb().from('learn_lessons').select('id,version,title,kind,status').order('id').order('version');
    if (rows.error) throw rows.error;
    const catalog = buildCatalog(lessonStates(rows.data ?? []));
    return <CurriculumTree catalog={catalog} packs={PACKS.map(pack => ({ id: pack.id, title: pack.title, access: ACCESS[pack.access.kind], count: packLessonIds(pack).length }))} />;
  } catch (error) { return <section className={styles.page}><h1>전체 커리큘럼</h1><p role="alert">{runtimeError(error, 'admin.curriculum')}</p></section>; }
}
