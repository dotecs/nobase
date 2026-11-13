export type Curriculum={id:string;title:string;chapters:{no:number;title:string;items:{no:number;title:string;lesson_id:string;worked?:{title:string;lesson_id:string}[]}[]}[]};
/** query: 목차의 강의 링크에 붙일 쿼리(관리자 미리보기의 draft=1). item.no가 0이면 강 번호가 없는 강의(팩 밖). */
export type CurriculumView={curriculum:Curriculum;available:string[];completed?:string[];query?:string};
export function curriculumIds(c:Curriculum){return [...new Set(c.chapters.flatMap(ch=>ch.items.flatMap(i=>[i.lesson_id,...(i.worked??[]).map(w=>w.lesson_id)])))];}
export function currentChapter(c:Curriculum,id:string){return c.chapters.find(ch=>ch.items.some(i=>i.lesson_id===id||i.worked?.some(w=>w.lesson_id===id)))?.no;}

export type NextLessonAction = { href: string; label: string; lessonId?: string };
export function nextLessonAction(course: CurriculumView | undefined, lessonId: string): NextLessonAction {
  const home = { href: '/learn', label: '학습 홈으로' };
  if (!course) return home;
  const lessons = course.curriculum.chapters.flatMap(chapter => chapter.items.flatMap(item => [
    { id: item.lesson_id, worked: false }, ...(item.worked ?? []).map(worked => ({ id: worked.lesson_id, worked: true })),
  ]));
  const index = lessons.findIndex(lesson => lesson.id === lessonId);
  const next = index >= 0 ? lessons[index + 1] : undefined;
  if (!next || !course.available.includes(next.id)) return home;
  return { href: '/learn/lesson/' + encodeURIComponent(next.id) + '?autoplay=1' + (course.query ? '&' + course.query : ''), label: next.worked ? '문제풀이로' : '다음 강의', lessonId: next.id };
}
