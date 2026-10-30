import type { Lesson } from './schema';
import type { ConceptNode,ConceptEdge } from './types';
export type ConceptCardData={node:ConceptNode;parents:ConceptNode[];children:ConceptNode[];lessonHref:string|null};
export function conceptNeighbors(id:string,nodes:ConceptNode[],edges:ConceptEdge[]){return {parents:nodes.filter(n=>edges.some(e=>e.type==='prerequisite'&&e.target_id===id&&e.source_id===n.id)),children:nodes.filter(n=>edges.some(e=>e.type==='prerequisite'&&e.source_id===id&&e.target_id===n.id))};}
export function conceptLessonHref(id:string,lesson:Lesson|null){if(!lesson)return null;const scene=lesson.scenes.find(s=>s.stage.type==='steps'?s.stage.steps.some(step=>step.concept_id===id):s.stage.type==='quiz'&&s.stage.trace_concept_id===id);return '/learn/lesson/'+lesson.id+(scene?'#'+scene.id:'');}
