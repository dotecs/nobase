'use server';
import { revalidatePath } from 'next/cache';
import { startDiagnosticRuntime, submitDiagnosticRuntime, expireDiagnosticRuntime } from '@/lib/learn/diagnostic-runtime';
import { runtimeError } from '@/lib/learn/runtime';
export async function startDiagnostic() { try { const id=await startDiagnosticRuntime();revalidatePath('/learn');return {id}; } catch(error){return {error:runtimeError(error)};} }
export async function submitAttempt(input:unknown) { try {await submitDiagnosticRuntime(input);revalidatePath('/learn');revalidatePath('/learn/diagnostic');return {ok:true};}catch(error){return {error:runtimeError(error)};} }
export async function expireDiagnostic(id:string) {try{await expireDiagnosticRuntime(id);revalidatePath('/learn');revalidatePath('/learn/diagnostic');return {ok:true};}catch(error){return {error:runtimeError(error)};} }
