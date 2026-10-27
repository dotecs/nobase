// Next's server-only entry point prevents importing this loader into client components.
import 'next/headers';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { ruleSchemas, type RuleConfigs, type RuleKey } from './schema';
import type { RuleContext } from './types';

const CACHE_MS = 60 * 1000;
const cache = new Map<RuleKey, { config: RuleConfigs[RuleKey]; version: number; expires: number }>();
export async function loadRuleConfigs<K extends RuleKey>(keys: readonly K[]): Promise<RuleContext<K>> {
  const now = Date.now(), unique = [...new Set(keys)];
  const missing = unique.filter(key => !cache.has(key) || cache.get(key)!.expires <= now);
  if (missing.length) {
    const result = await createAdminSupabaseClient().from('learn_rule_configs').select('key,version,config,active_from')
      .in('key', missing).lte('active_from', new Date(now).toISOString()).order('version', { ascending: false });
    if (result.error) throw result.error;
    const rows = (result.data ?? []) as { key: string; version: number; config: unknown; active_from: string }[];
    const loaded = missing.map(key => {
      const row = rows.find(value => value.key === key);
      if (!row || !Number.isInteger(row.version) || row.version < 1) throw new Error(`Missing active rule config: ${key}`);
      return [key, { config: ruleSchemas[key].parse(row.config), version: row.version, expires: now + CACHE_MS }] as const;
    });
    for (const [key, value] of loaded) cache.set(key, value);
  }
  return structuredClone({
    configs: Object.fromEntries(unique.map(key => [key, cache.get(key)!.config])),
    rule_version: Object.fromEntries(unique.map(key => [key, cache.get(key)!.version])),
  }) as RuleContext<K>;
}
