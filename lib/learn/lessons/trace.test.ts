import { describe,it,expect } from 'vitest';
import { traceConcepts,answerTrace,initialTrace } from './trace';
import type { ConceptNode,ConceptEdge } from './types';
const nodes=['A','B','C','D','E','F','G'].map(id=>({id,name:id} as ConceptNode));
const edges=nodes.slice(1).map((node,i)=>({source_id:nodes[i].id,target_id:node.id,type:'prerequisite'} as ConceptEdge));
describe('concept trace',()=>{
 it('starts at D and stops at first gap C, preserving the path',()=>{const chain=traceConcepts('D',nodes,edges);const one=answerTrace(chain,initialTrace(),true);expect(answerTrace(chain,one,false)).toEqual({index:2,path:['D','C'],gap:'C',finished:true});});
 it('returns no gap when every node passes',()=>{const chain=traceConcepts('D',nodes,edges);const state=chain.reduce(s=>answerTrace(chain,s,true),initialTrace());expect(state.gap).toBeNull();expect(state.finished).toBe(true);expect(state.path).toEqual(['D','C','B','A']);});
 it('asks at most five questions',()=>expect(traceConcepts('G',nodes,edges).map(n=>n.id)).toEqual(['G','F','E','D','C']));
 it('visits shared or cyclic prerequisites only once',()=>{expect(traceConcepts('D',nodes,[...edges,{source_id:'D',target_id:'A',type:'prerequisite'}]).map(n=>n.id)).toEqual(['D','C','B','A']);});
 it('does not invent a gap for missing concept data or change completed runs',()=>{expect(traceConcepts('missing',nodes,edges)).toEqual([]);const state=answerTrace(nodes,initialTrace(),false);expect(answerTrace(nodes,state,true)).toBe(state);});
});
