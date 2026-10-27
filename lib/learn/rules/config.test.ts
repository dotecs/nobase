import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { context, now } from './test-fixtures';
const mock = vi.hoisted(() => ({ calls: 0, rows: [] as { key: string; version: number; config: unknown; active_from: string }[], error: null as null | { message: string } }));
vi.mock('next/headers', () => ({}));
vi.mock('@/lib/supabase-admin', () => ({ createAdminSupabaseClient: () => {
  mock.calls++;
  return { from: (table: string) => {
    expect(table).toBe('learn_rule_configs');
    return { select: () => ({ in: (_column: string, keys: string[]) => ({ lte: (_col: string, time: string) => ({ order: async () => ({ data: mock.rows.filter(row => keys.includes(row.key) && row.active_from <= time).sort((a,b) => b.version - a.version), error: mock.error }) }) }) }) };
  } };
} }));
describe('service-role rule config loader', () => {
  beforeEach(() => {
    vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date(now)); mock.calls = 0; mock.error = null;
    const c = context(); mock.rows = Object.entries(c.configs).map(([key, config]) => ({ key, config, version: c.rule_version[key as keyof typeof c.configs], active_from: '2026-01-01T00:00:00.000Z' }));
  });
  afterEach(() => vi.useRealTimers());
  it('returns latest active version for each requested key', async () => {
    mock.rows.push({ key: 'gate', config: { coach_gate_after_diagnostic: false }, version: 2, active_from: now });
    mock.rows.push({ key: 'gate', config: { coach_gate_after_diagnostic: true }, version: 3, active_from: '2027-01-01' });
    const { loadRuleConfigs } = await import('./config');
    expect(await loadRuleConfigs(['gate','evidence'])).toMatchObject({ configs: { gate: { coach_gate_after_diagnostic: false } }, rule_version: { gate: 2, evidence: 2 } });
  });
  it('caches for 60 seconds, then refreshes', async () => {
    const { loadRuleConfigs } = await import('./config'); await loadRuleConfigs(['gate']);
    vi.advanceTimersByTime(59999); await loadRuleConfigs(['gate']); expect(mock.calls).toBe(1);
    vi.advanceTimersByTime(1); await loadRuleConfigs(['gate']); expect(mock.calls).toBe(2);
  });
  it('caller mutations cannot poison cached config', async () => {
    const { loadRuleConfigs } = await import('./config'); const first = await loadRuleConfigs(['recommendation']); first.configs.recommendation.prefer_states.length = 0;
    expect((await loadRuleConfigs(['recommendation'])).configs.recommendation.prefer_states.length).toBeGreaterThan(0);
  });
  it('missing configs fail instead of inventing defaults', async () => { mock.rows = []; const { loadRuleConfigs } = await import('./config'); await expect(loadRuleConfigs(['session'])).rejects.toThrow('session'); });
  it('malformed newest config fails without falling back to stale version', async () => { mock.rows.push({ key:'gate',version:2,config:{},active_from:now }); const { loadRuleConfigs } = await import('./config'); await expect(loadRuleConfigs(['gate'])).rejects.toThrow(); });
  it('DB errors are propagated', async () => { mock.error = { message: 'offline' }; const { loadRuleConfigs } = await import('./config'); await expect(loadRuleConfigs(['gate'])).rejects.toEqual(mock.error); });
  it('loads new keys without refreshing valid cached keys', async () => { const { loadRuleConfigs } = await import('./config'); await loadRuleConfigs(['gate']); await loadRuleConfigs(['gate','session']); await loadRuleConfigs(['gate','session']); expect(mock.calls).toBe(2); });
});
