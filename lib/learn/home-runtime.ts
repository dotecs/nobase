import 'next/headers';
import { ownRows } from './learning-runtime';
import { runtimePack,type Learner,type StateRow,type AttemptRow } from './runtime';
import type { Evidence } from './rules/types';
import { summarizeHome } from './home-summary';
export async function homeSummary(learner:Learner){const [pack,states,attempts]=await Promise.all([runtimePack(learner),ownRows<StateRow>('learn_ability_states',learner.user_id),ownRows<AttemptRow>('learn_attempts',learner.user_id)]);return summarizeHome(pack,learner.goal_id,states.map(row=>({...row,evidence:row.evidence as unknown as Evidence})),attempts,new Date());}
