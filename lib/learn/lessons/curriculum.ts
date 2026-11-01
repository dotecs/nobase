export type Curriculum={id:string;title:string;chapters:{no:number;title:string;items:{no:number;title:string;lesson_id:string;worked?:{title:string;lesson_id:string}[]}[]}[]};
export type CurriculumView={curriculum:Curriculum;available:string[];completed?:string[]};
export function curriculumIds(c:Curriculum){return [...new Set(c.chapters.flatMap(ch=>ch.items.flatMap(i=>[i.lesson_id,...(i.worked??[]).map(w=>w.lesson_id)])))];}
export function currentChapter(c:Curriculum,id:string){return c.chapters.find(ch=>ch.items.some(i=>i.lesson_id===id||i.worked?.some(w=>w.lesson_id===id)))?.no;}
