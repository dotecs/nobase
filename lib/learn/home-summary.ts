import type { RulePack,State } from './rules/types';
import { DAY_MS } from './rules/types';
type Activity={created_at:string};
const day=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function summarizeHome(pack:RulePack,goalId:string,states:State[],attempts:Activity[],now:Date){
  const byId=new Map(states.map(row=>[row.ability_id,row.state])),goals=new Set(pack.goals.requirements.filter(row=>row.goal_id===goalId).map(row=>row.ability_id));
  const mastered=(id:string)=>byId.get(id)==='verified'||byId.get(id)==='retained';
  const units=[...pack.units].sort((a,b)=>a.order-b.order).map(unit=>{const abilities=pack.abilities.filter(row=>row.unit_id===unit.id);return {id:unit.id,title:unit.title,total:abilities.length,mastered:abilities.filter(row=>mastered(row.id)).length,abilities:abilities.map(row=>({id:row.id,name:row.name,state:byId.get(row.id)??'unknown'}))};});
  const activity=Array.from({length:7},(_,index)=>{const date=day(new Date(now.getTime()-(6-index)*DAY_MS));return {date,count:attempts.filter(row=>Date.parse(row.created_at)<=now.getTime()&&day(new Date(row.created_at))===date).length};});
  return {goalTitle:pack.goals.goals.find(row=>row.id===goalId)?.title??'나의 목표',total:goals.size,verified:[...goals].filter(id=>byId.get(id)==='verified').length,retained:[...goals].filter(id=>byId.get(id)==='retained').length,units,activity};
}
export type HomeSummary=ReturnType<typeof summarizeHome>;
