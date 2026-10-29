import { LearnUserError } from './errors';
import 'next/headers';
import { createHash } from 'node:crypto';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Database, Json } from '@/lib/database.types';
import { hasLearnAccess } from './access';
import type { RulePack, RuleContext } from './rules/types';
import { loadRuleConfigs } from './rules/config';
export type Learner = Database['public']['Tables']['learn_learners']['Row'];
export type Session = Database['public']['Tables']['learn_sessions']['Row'];
export type AttemptRow = Database['public']['Tables']['learn_attempts']['Row'] & { steps?: string[] | null };
export type StateRow = Database['public']['Tables']['learn_ability_states']['Row'];
export const json = (value: unknown) => value as Json;
export function stableId(value: string) { const hash = createHash('sha256').update(value).digest('hex'); return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`; }
export async function requireLearner() {
  const client = await createServerSupabaseClient(); const {data:{user}} = await client.auth.getUser();
  if (!user || !(await hasLearnAccess(user.id)).granted) throw new LearnUserError('코칭 과정 등록 후 이용할 수 있습니다.');
  return user;
}
export async function requireCoach() {
  const client = await createServerSupabaseClient(); const {data:{user}} = await client.auth.getUser();
  if (!user) throw new LearnUserError('관리자 로그인이 필요합니다.');
  const result = await client.from('profiles').select('role').eq('user_id', user.id).single();
  if ((result.data as {role:string}|null)?.role !== 'admin') throw new LearnUserError('관리자만 이용할 수 있습니다.');
  return user;
}
export async function learnerRow(userId: string, create = false): Promise<Learner> {
  const client = createAdminSupabaseClient();
  if (create && !(await hasLearnAccess(userId,{requireEnrollment:true})).granted) throw new LearnUserError('코칭 과정 등록 후 이용할 수 있습니다.');
  if (create) { const result = await client.from('learn_learners').upsert({user_id:userId,pack_id:'root-math',goal_id:'g-linear-eq-basic'} as never,{onConflict:'user_id',ignoreDuplicates:true}); if(result.error)throw result.error; }
  const result = await client.from('learn_learners').select('*').eq('user_id',userId).single(); if(result.error)throw result.error; return result.data as unknown as Learner;
}
export async function runtimeConfigs(): Promise<RuleContext> { return loadRuleConfigs(['diagnostic','evidence','gate','recommendation','review_intervals','session','solvers']); }
export async function runtimePack(learner: Learner): Promise<RulePack> {
  const client = createAdminSupabaseClient();
  const results = await Promise.all([
    client.from('learn_units').select('*').eq('pack_id',learner.pack_id).order('order'),
    client.from('learn_abilities').select('*').eq('pack_id',learner.pack_id).order('order_in_unit'),
    client.from('learn_ability_edges').select('*').eq('pack_id',learner.pack_id),
    client.from('learn_goals').select('*').eq('id',learner.goal_id),
    client.from('learn_goal_requirements').select('*').eq('goal_id',learner.goal_id),
    client.from('learn_diagnostic_scripts').select('*').eq('goal_id',learner.goal_id).order('version',{ascending:false}).limit(1),
  ]);
  for(const result of results) if(result.error)throw result.error;
  if(!results[5].data?.length)throw new Error('진단 스크립트가 없습니다.');
  return {units:results[0].data,abilities:results[1].data,edges:results[2].data,goals:{goals:results[3].data,requirements:results[4].data},diagnostic:results[5].data[0]} as unknown as RulePack;
}
export async function sessionRow(sessionId: string, userId: string): Promise<Session> {
  const result = await createAdminSupabaseClient().from('learn_sessions').select('*').eq('id',sessionId).eq('user_id',userId).single(); if(result.error)throw result.error; return result.data as unknown as Session;
}
export async function sessionAttempts(sessionId: string, userId: string): Promise<AttemptRow[]> {
  const result = await createAdminSupabaseClient().from('learn_attempts').select('*').eq('session_id',sessionId).eq('user_id',userId).order('created_at'); if(result.error)throw result.error; return (result.data ?? []) as unknown as AttemptRow[];
}
export function runtimeError(error: unknown, where: string) {
  if (error instanceof LearnUserError) return error.message;
  const original = error && typeof error === 'object' ? error as { message?: unknown; stack?: unknown } : null;
  const message = typeof original?.message === 'string' ? original.message : String(error);
  const stack = typeof original?.stack === 'string' ? original.stack : null;
  console.error('[learn]', { where, message, stack });
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export async function attemptedItemIds(userId: string, filter: { excludeSessionId?: string; excludeAttemptId?: string; atOrBefore?: string } = {}): Promise<string[]> {
  const ids = new Set<string>(), size = 500, client = createAdminSupabaseClient();
  for (let offset = 0; ; offset += size) {
    let query = client.from('learn_attempts').select('item_id').eq('user_id', userId);
    if (filter.excludeSessionId) query = query.neq('session_id', filter.excludeSessionId);
    if (filter.excludeAttemptId) query = query.neq('id', filter.excludeAttemptId);
    if (filter.atOrBefore) query = query.lte('created_at', filter.atOrBefore);
    const result = await query.order('id').range(offset, offset + size - 1);
    if (result.error) throw result.error;
    const batch = (result.data ?? []) as { item_id: string }[];
    for (const row of batch) ids.add(row.item_id);
    if (batch.length < size) return [...ids];
  }
}
