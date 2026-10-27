import 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import type { Database } from '@/lib/database.types';
import { AnswerSpec } from './answer-spec';
import { latestItems } from './rules/types';
import type { AnswerType, ItemUsage } from './types';

export type LearnItem = Omit<Database['public']['Tables']['learn_items']['Row'], 'answer_type' | 'usage'> & { answer_type: AnswerType; usage: ItemUsage };
export type StudentItem = { id: string; version: number; ability_id: string; stem_md: string; answer_type: AnswerType; usage: ItemUsage; options: { id: string; text_md: string }[] };
// Call only after the caller authenticates and checks course access or admin status.
export async function loadLearnItems(abilityIds: string[]): Promise<LearnItem[]> {
  if (!abilityIds.length) return [];
  const client = createAdminSupabaseClient();
  const rows: LearnItem[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const result = await client.from('learn_items').select('*').in('ability_id', abilityIds).in('status', ['reviewed', 'live']).order('id').order('version', { ascending: false }).range(offset, offset + pageSize - 1);
    if (result.error) throw result.error;
    const page = (result.data ?? []) as LearnItem[]; rows.push(...page);
    if (page.length < pageSize) break;
  }
  const selected = new Map(latestItems(rows).map(row => [row.id, row.version]));
  return rows.filter(row => selected.get(row.id) === row.version);
}
export function toStudentItem(item: LearnItem): StudentItem {
  const spec = item.answer_type === 'choice' ? AnswerSpec.parse(item.answer_spec) : null;
  return { id: item.id, version: item.version, ability_id: item.ability_id, stem_md: item.stem_md, answer_type: item.answer_type, usage: item.usage,
    options: spec?.type === 'choice' ? spec.options.map(option => ({ id: option.id, text_md: option.text_md })) : [] };
}
