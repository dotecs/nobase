import 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import type { Json } from '@/lib/database.types';
import type { RecordPayload } from './record';
export type CoachPayload = Pick<RecordPayload,'user_id'|'idempotency_key'|'state'|'event'|'reviews'|'review_updates'|'learner_status'> & {
  coach_id:string;kind:'attempt_review'|'diagnostic_gate'|'state_override'|'path_override';
  review:{attempt_id:string;verdict:'correct'|'incorrect'|'partial';note:string}|null;
  decision:{kind:'diagnostic_gate'|'state_override'|'path_override';payload:Json}|null;
};
export async function recordCoachAction(payload:CoachPayload) {
  const result=await createAdminSupabaseClient().rpc('learn_record_coach_action',{p_payload:payload as unknown as Json} as never) as unknown as {data:string|null;error:{message:string;code?:string}|null};
  if(result.error)throw result.error;if(!result.data)throw new Error('코치 기록 저장 실패');return result.data;
}
