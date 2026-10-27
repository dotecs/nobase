'use server';
import { revalidatePath } from 'next/cache';
import { runCoachAction } from '@/lib/learn/coach-actions';
import { runtimeError } from '@/lib/learn/runtime';
export async function saveCoachAction(input:unknown) {try{const message=await runCoachAction(input);revalidatePath('/admin/learn/learners','layout');revalidatePath('/learn');return{message};}catch(error){return{error:runtimeError(error)};}}
export async function approveLearnerGate(userId:string,note:string,requestId:string,eventAt:string){return saveCoachAction({kind:'diagnostic_gate',userId,note,requestId,eventAt});}
export async function overrideAbilityState(userId:string,abilityId:string,state:string,note:string,requestId:string,eventAt:string){return saveCoachAction({kind:'state_override',userId,abilityId,state,note,requestId,eventAt});}
export async function reviewAttempt(userId:string,attemptId:string,verdict:string,note:string,requestId:string,eventAt:string){return saveCoachAction({kind:'review_attempt',userId,attemptId,verdict,note,requestId,eventAt});}
