import type { ConceptNode,ConceptEdge } from './types';
/** Walk incoming prerequisite edges depth first, starting with the requested node. */
export function traceConcepts(start:string,nodes:ConceptNode[],edges:ConceptEdge[],limit=5){
 const byId=new Map(nodes.map(node=>[node.id,node])),visited=new Set<string>(),result:ConceptNode[]=[];
 function visit(id:string){if(visited.has(id)||result.length>=Math.min(5,limit))return;visited.add(id);const node=byId.get(id);if(!node)return;result.push(node);for(const edge of edges)if(edge.type==='prerequisite'&&edge.target_id===id)visit(edge.source_id);}
 visit(start);return result;
}
export type TraceState={index:number;path:string[];gap:string|null;finished:boolean};
export function initialTrace():TraceState{return {index:0,path:[],gap:null,finished:false};}
export function answerTrace(nodes:ConceptNode[],state:TraceState,correct:boolean):TraceState{
 if(state.finished)return state;const node=nodes[state.index];if(!node)return {...state,finished:true};
 const path=[...state.path,node.id];return {index:state.index+1,path,gap:correct?null:node.id,finished:!correct||state.index+1>=nodes.length};
}
