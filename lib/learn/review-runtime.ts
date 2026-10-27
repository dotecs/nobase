import 'next/headers';
import { activeLearner,ownRows,historyAttempts,openLearningSession,createLearningSession } from './learning-runtime';
import { runtimePack,runtimeConfigs,type AttemptRow } from './runtime';
import { loadLearnItems } from './items';
import type { ReviewSchedule } from './rules/review';
import { planReview } from './rules/review-plan';
export async function dueReviewAbilities(userId:string){const rows=await ownRows<ReviewSchedule>('learn_review_schedule',userId);return [...new Set(rows.filter(row=>row.status==='due'&&Date.parse(row.due_at)<=Date.now()).map(row=>row.ability_id))];}
export async function reviewList(){const {user,learner}=await activeLearner(),pack=await runtimePack(learner),due=await dueReviewAbilities(user.id);return due.map(id=>({id,name:pack.abilities.find(row=>row.id===id)?.name??id}));}
export async function startReviewRuntime(){
  const {user,learner}=await activeLearner(),open=await openLearningSession(user.id);if(open)return {id:open.id};
  const pack=await runtimePack(learner),config=await runtimeConfigs(),items=await loadLearnItems(pack.abilities.map(row=>row.id));
  const [schedule,attempts]=await Promise.all([ownRows<ReviewSchedule>('learn_review_schedule',user.id),ownRows<AttemptRow>('learn_attempts',user.id)]);
  const plan=planReview(schedule,new Date().toISOString(),items,historyAttempts(attempts,items),config);
  if(!plan.result.items.length)return {empty_reason:plan.result.empty_reason};
  return {id:await createLearningSession(user.id,'review',plan.result.items,config,learner.pack_id,plan.trace)};
}
