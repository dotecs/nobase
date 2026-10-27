import { latestItems,planned,timestamp,traced,type Attempt,type PlannedItem,type RuleContext,type RuleItem } from './types';
import type { ReviewSchedule } from './review';
export function planReview(schedule:ReviewSchedule[],now:string,items:RuleItem[],history:Attempt[],config:RuleContext<'session'|'recommendation'>){
  const due=[...new Set(schedule.filter(row=>row.status==='due'&&timestamp(row.due_at)<=timestamp(now)).sort((a,b)=>timestamp(a.due_at)-timestamp(b.due_at)).map(row=>row.ability_id))];
  const available=latestItems(items),seen=new Set(history.map(row=>row.item_id)),stems=new Set<string>(),selected:PlannedItem[]=[],missing:string[]=[];
  const order=config.configs.recommendation.review_usage_order;
  for(const ability of due){let count=0;for(const item of available.filter(row=>row.ability_id===ability&&!seen.has(row.id)&&order.includes(row.usage)).sort((a,b)=>order.indexOf(a.usage)-order.indexOf(b.usage)||a.id.localeCompare(b.id))){
    if(count>=config.configs.session.review_items_per_ability||selected.length>=config.configs.session.items_per_session)break;
    if(config.configs.recommendation.skip_duplicate_stems&&stems.has(item.stem_md))continue;
    selected.push(planned(item,'review'));stems.add(item.stem_md);count++;
  }if(!count)missing.push(ability);}
  return traced({items:selected,missing,empty_reason:selected.length?null:due.length?'insufficient_items':'no_due_reviews'},config,['session','recommendation'],'plan_review',['due_only','unseen_variants','usage_priority'],{due,missing});
}
