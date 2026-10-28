import 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import type { Database, Json } from '@/lib/database.types';
type Tables = Database['public']['Tables'];
export type RecordPayload = {
  idempotency_key: string; session_id: string; user_id: string;
  attempt: Omit<Tables['learn_attempts']['Insert'], 'id' | 'session_id' | 'user_id' | 'created_at' | 'idempotency_key'> & { steps?: string[] | null };
  state: Omit<Tables['learn_ability_states']['Insert'], 'user_id' | 'created_at' | 'updated_at'> | null;
  event: Pick<Tables['learn_ability_state_events']['Insert'], 'from_state' | 'to_state' | 'reason' | 'rule_version'> | null;
  reviews: { ability_id: string; due_at: string; interval_index: number }[];
  review_updates: { id: string; status: 'done' | 'skipped' }[];
  session_plan_append: Json | null; learner_status: Tables['learn_learners']['Row']['status'] | null;
};
export async function recordAttempt(payload: RecordPayload) {
  const result = await createAdminSupabaseClient().rpc('learn_record_attempt', { p_payload: payload as unknown as Json } as never) as unknown as { data: string | null; error: { message: string; code?: string } | null };
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Attempt was not recorded');
  return result.data as string;
}
