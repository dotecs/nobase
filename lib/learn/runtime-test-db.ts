import { randomUUID } from 'node:crypto';
import { context, pack, items } from './rules/test-fixtures';
type Row = Record<string, unknown>;
export const testUser = '00000000-0000-4000-8000-000000000001';
export function runtimeTestDb() {
  const tables=new Map<string,Row[]>(),rows=(name:string)=>{if(!tables.has(name))tables.set(name,[]);return tables.get(name)!;};
  const p=pack(),goal='g-linear-eq-basic';
  rows('profiles').push({user_id:testUser,role:'admin',name:'[TEST] learner'});
  for(const [table,values] of Object.entries({learn_units:p.units,learn_abilities:p.abilities,learn_ability_edges:p.edges,learn_goals:p.goals.goals})) rows(table).push(...values.map(row=>({...row,pack_id:'root-math',...(table==='learn_goals'?{id:goal}:{})})));
  rows('learn_goal_requirements').push(...p.goals.requirements.map(row=>({...row,goal_id:goal})));
  rows('learn_diagnostic_scripts').push({...p.diagnostic,goal_id:goal});
  rows('learn_items').push(...items().map(row=>({...row,answer_type:'number',answer_spec:{type:'number',value:'1',relation:'='},hints:[],rubric:[],misconception_ids:[],required_abilities:[]})));
  const c=context();rows('learn_rule_configs').push(...Object.entries(c.configs).map(([key,config])=>({key,config,version:c.rule_version[key as keyof typeof c.configs],active_from:'2020-01-01T00:00:00Z'})));
  const client={
    auth:{getUser:async()=>({data:{user:{id:testUser}},error:null})},
    storage:{from:()=>({list:async(_path:string,{search}:{search:string})=>({data:[{name:search}],error:null}),createSignedUrl:async(path:string)=>({data:{signedUrl:`https://example.invalid/${path}`},error:null})})},
    from(name:string){
      let mode='read',payload:Row[]=[];let conflict='id',ignore=false,limit=Infinity,offset=0;const filters:((row:Row)=>boolean)[]=[];const orders:{key:string;asc:boolean}[]=[];
      const execute=()=>{
        const list=rows(name);
        if(mode==='insert'||mode==='upsert')for(const value of payload){const old=mode==='upsert'?list.find(row=>conflict.split(',').every(key=>row[key]===value[key])):undefined;if(old){if(!ignore)Object.assign(old,structuredClone(value));}else list.push({id:randomUUID(),created_at:new Date().toISOString(),started_at:new Date().toISOString(),ended_at:null,status:name==='learn_learners'?'diagnostic_pending':'due',...structuredClone(value)});}
        let selected=list.filter(row=>filters.every(filter=>filter(row)));for(const order of [...orders].reverse())selected.sort((a,b)=>a[order.key]===b[order.key]?0:(String(a[order.key])<String(b[order.key])?-1:1)*(order.asc?1:-1));selected=selected.slice(offset,offset+limit);
        if(mode==='update')selected.forEach(row=>Object.assign(row,structuredClone(payload[0])));mode='read';return{data:structuredClone(selected),error:null};
      };
      const query={select:()=>query,neq:(key:string,value:unknown)=>{filters.push(row=>row[key]!==value);return query;},eq:(key:string,value:unknown)=>{filters.push(row=>row[key]===value);return query;},in:(key:string,value:unknown[])=>{filters.push(row=>value.includes(row[key]));return query;},is:(key:string,value:unknown)=>{filters.push(row=>(row[key]??null)===value);return query;},lte:(key:string,value:string)=>{filters.push(row=>String(row[key])<=value);return query;},contains:(key:string,value:Row)=>{filters.push(row=>Object.entries(value).every(([k,v])=>(row[key] as Row)?.[k]===v));return query;},order:(key:string,options?:{ascending?:boolean})=>{orders.push({key,asc:options?.ascending??true});return query;},limit:(n:number)=>{limit=n;return query;},range:(a:number,b:number)=>{offset=a;limit=b-a+1;return query;},insert:(value:Row|Row[])=>{mode='insert';payload=Array.isArray(value)?value:[value];return query;},upsert:(value:Row|Row[],options?:{onConflict?:string;ignoreDuplicates?:boolean})=>{mode='upsert';payload=Array.isArray(value)?value:[value];conflict=options?.onConflict??'id';ignore=!!options?.ignoreDuplicates;return query;},update:(value:Row)=>{mode='update';payload=[value];return query;},single:async()=>{const result=execute();return{data:result.data[0]??null,error:result.data.length?null:{message:'not found'}};},maybeSingle:async()=>({data:execute().data[0]??null,error:null}),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(execute()).then(resolve)};return query;
    },
    async rpc(name:string,{p_payload:p}:{p_payload:Row}){
      if(name==='learn_record_coach_action'){
        const learner=rows('learn_learners').find(row=>row.user_id===p.user_id);if(!learner)return{data:null,error:{message:'Learner missing'}};
        const table=p.kind==='attempt_review'?'learn_coach_reviews':'learn_coach_decisions';const old=rows(table).find(row=>row.idempotency_key===p.idempotency_key);if(old)return{data:old.id,error:null};
        const id=randomUUID();rows(table).push({id,created_at:new Date().toISOString(),user_id:p.user_id,coach_id:p.coach_id,idempotency_key:p.idempotency_key,...(p.review??p.decision) as Row});
        if(p.state){const value=p.state as Row,oldState=rows('learn_ability_states').find(row=>row.user_id===p.user_id&&row.ability_id===value.ability_id);if(oldState)Object.assign(oldState,structuredClone(value));else rows('learn_ability_states').push({user_id:p.user_id,...structuredClone(value)});}
        if(p.event)rows('learn_ability_state_events').push({id:randomUUID(),user_id:p.user_id,ability_id:(p.state as Row)?.ability_id,...p.event as Row});
        for(const review of p.reviews as Row[])rows('learn_review_schedule').push({id:randomUUID(),user_id:p.user_id,status:'due',...review});
        for(const update of p.review_updates as Row[]){const row=rows('learn_review_schedule').find(row=>row.id===update.id);if(row)row.status=update.status;}
        if(p.learner_status)learner.status=p.learner_status;
        return{data:id,error:null};
      }
      if(name!=='learn_record_attempt')throw new Error('Unexpected RPC');const session=rows('learn_sessions').find(row=>row.id===p.session_id&&row.user_id===p.user_id);
      if(!session||session.ended_at)return{data:null,error:{message:'Invalid active session'}};
      const existing=rows('learn_attempts').find(row=>row.session_id===p.session_id&&row.idempotency_key===p.idempotency_key);if(existing)return{data:existing.id,error:null};
      const id=randomUUID();rows('learn_attempts').push({id,created_at:new Date().toISOString(),user_id:p.user_id,session_id:p.session_id,idempotency_key:p.idempotency_key,...p.attempt as Row});
      if(p.state){const state=p.state as Row;const old=rows('learn_ability_states').find(row=>row.user_id===p.user_id&&row.ability_id===state.ability_id);if(old)Object.assign(old,state);else rows('learn_ability_states').push({user_id:p.user_id,...state});}
      if(p.event)rows('learn_ability_state_events').push({id:randomUUID(),user_id:p.user_id,ability_id:(p.state as Row)?.ability_id,attempt_id:id,...p.event as Row});
      for(const review of (p.reviews??[]) as Row[])rows('learn_review_schedule').push({id:randomUUID(),user_id:p.user_id,status:'due',...review});
      for(const update of (p.review_updates??[]) as Row[]){const row=rows('learn_review_schedule').find(row=>row.id===update.id&&row.user_id===p.user_id);if(row)row.status=update.status;}
      if(p.session_plan_append)session.plan=[...session.plan as Row[],...p.session_plan_append as Row[]];
      if(p.learner_status)rows('learn_learners').find(row=>row.user_id===p.user_id)!.status=p.learner_status;
      return{data:id,error:null};
    },
  };
  return{client,rows};
}
