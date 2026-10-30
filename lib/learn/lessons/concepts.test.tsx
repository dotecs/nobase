import { describe,it,expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConceptCard } from '@/components/learn/lesson/ConceptCard';
import { conceptLessonHref,conceptNeighbors } from './concepts';
import { prototypeLesson } from './prototype-fixture';
import type { ConceptNode } from './types';
describe('concept cards',()=>{
 it('links the exact first scene referencing a concept',()=>{expect(conceptLessonHref('c.discriminant-meaning',prototypeLesson())).toBe('/learn/lesson/rm-11#s7');expect(conceptLessonHref('c.other',prototypeLesson())).toBe('/learn/lesson/rm-11');expect(conceptLessonHref('c.a',null)).toBeNull();});
 it('separates prerequisite parents from dependent children',()=>{const nodes=['a','b','c'].map(id=>({id} as ConceptNode));expect(conceptNeighbors('b',nodes,[{source_id:'a',target_id:'b',type:'prerequisite'},{source_id:'b',target_id:'c',type:'prerequisite'}])).toEqual({parents:[nodes[0]],children:[nodes[2]]});});
 it('renders the shared card, lesson anchor, neighbors and check question',()=>{const node={id:'b',name:'판별식',one_line:'근의 개수를 알려 줘요.',check_question:{stem_md:'D가 양수이면?',options:[{id:'a',text_md:'두 실근'},{id:'b',text_md:'실근 없음'}],correct:'a'}} as ConceptNode;const html=renderToStaticMarkup(<ConceptCard data={{node,parents:[{id:'a',name:'근의 공식'} as ConceptNode],children:[],lessonHref:'/learn/lesson/rm-11#s7'}}/>);expect(html).toContain('근의 개수를 알려 줘요.');expect(html).toContain('href="/learn/lesson/rm-11#s7"');expect(html).toContain('href="/learn/concept/a"');expect(html).toContain('D가 양수이면?');});
});
