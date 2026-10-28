'use server';
import { revalidatePath } from 'next/cache';
import { startDiagnosticRuntime, submitDiagnosticRuntime, expireDiagnosticRuntime } from '@/lib/learn/diagnostic-runtime';
import { runtimeError } from '@/lib/learn/runtime';
import { startReviewRuntime } from '@/lib/learn/review-runtime';
export async function startReview(){try{const result=await startReviewRuntime();revalidatePath('/learn','layout');return result;}catch(error){return {error:runtimeError(error, 'startReview')};}}
import { startLearningRuntime, submitLearningRuntime, expireLearningRuntime } from '@/lib/learn/learning-runtime';
export async function startSession() {try {const result=await startLearningRuntime();revalidatePath('/learn');return result;}catch(error){return {error:runtimeError(error, 'startSession')};}}
export async function submitLearningAttempt(input:unknown) {try {await submitLearningRuntime(input);revalidatePath('/learn','layout');return {ok:true};}catch(error){return {error:runtimeError(error, 'submitLearningAttempt')};}}
export async function expireSession(id:string) {try {await expireLearningRuntime(id);revalidatePath('/learn','layout');return {ok:true};}catch(error){return {error:runtimeError(error, 'expireSession')};}}
export async function startDiagnostic() { try { const id=await startDiagnosticRuntime();revalidatePath('/learn');return {id}; } catch(error){return {error:runtimeError(error, 'startDiagnostic')};} }
export async function submitAttempt(input:unknown) { try {await submitDiagnosticRuntime(input);revalidatePath('/learn');revalidatePath('/learn/diagnostic');return {ok:true};}catch(error){return {error:runtimeError(error, 'submitAttempt')};} }
export async function expireDiagnostic(id:string) {try{await expireDiagnosticRuntime(id);revalidatePath('/learn');revalidatePath('/learn/diagnostic');return {ok:true};}catch(error){return {error:runtimeError(error, 'expireDiagnostic')};} }

import { savePadDraftRuntime, readPadDraftRuntime } from '@/lib/learn/pad-runtime';
export async function savePadDraft(input:unknown) {try{return await savePadDraftRuntime(input);}catch(error){return {error:runtimeError(error,'savePadDraft')};}}
export async function readPadDraft(input:unknown) {try{return await readPadDraftRuntime(input);}catch(error){return {error:runtimeError(error,'readPadDraft')};}}
