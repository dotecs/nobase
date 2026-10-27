import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { nextDiagnosticFollowup, planDiagnosticBase, summarizeDiagnostic, timeoutDiagnostic, type DiagnosticProgress } from './diagnostic';
import { attempt, context, items, now, pack } from './test-fixtures';

describe('diagnostic rules', () => {
  it('real pack: one base failure preserves five observed successes', () => {
    const read = (name: string) => parse(readFileSync(`content/learn/packs/root-math/${name}.yaml`, 'utf8'));
    const p = { units: read('units'), abilities: read('abilities'), edges: read('edges'), goals: read('goals'), diagnostic: read('diagnostic') };
    const attempts = p.diagnostic.base_abilities.map((ability_id: string, i: number) => attempt(i ? 'correct_independent' : 'incorrect', { ability_id, item_id: `${ability_id}-01` }));
    const out = summarizeDiagnostic(attempts, p, context());
    for (const id of ['02-5','03-1','04-3','05-4','06-3']) expect(out.result.find(row => row.ability_id === id)).toMatchObject({ state: 'learning', evidence: { independent_correct: 1 } });
    expect(out.trace.details).toMatchObject({ blocked: expect.arrayContaining(['02-5']) });
  });
  it('selects the configured six abilities and latest version without answers', () => {
    const input = items(); input.push({ ...input[18], version: 2 });
    const output = planDiagnosticBase(pack(), input, context());
    expect(output.result.map(row => row.ability_id)).toEqual(pack().diagnostic.base_abilities);
    expect(output.result[0].item_version).toBe(2);
    expect(output.trace.rule_version).toEqual({ diagnostic: 1, recommendation: 1 });
    expect(JSON.stringify(output)).not.toContain('answer_spec');
  });
  it('reports the missing ability', () => expect(() => planDiagnosticBase(pack(), items().filter(row => row.ability_id !== '04-1'), context())).toThrow('04-1'));
  it('does not hardcode base count', () => { const p = pack(), c = context(); p.diagnostic.base_abilities = ['01-4']; c.configs.diagnostic.base_items = 1; expect(planDiagnosticBase(p, items(), c).result).toHaveLength(1); });
  it('errors when base ability list is too short', () => { const p = pack(); p.diagnostic.base_abilities.pop(); expect(() => planDiagnosticBase(p, items(), context())).toThrow('5/6'); });
  it('honors changed usage ordering', () => { const c = context(); c.configs.recommendation.diagnostic_usage_order = ['practice', 'assessment']; expect(planDiagnosticBase(pack(), items(), c).result.every(row => row.usage === 'practice')).toBe(true); });
  it('uses practice when diagnostic and assessment are unavailable', () => expect(planDiagnosticBase(pack(), items().filter(row => row.usage === 'practice'), context()).result).toHaveLength(6));
  it('avoids duplicate groups when another group exists', () => {
    const input = items(); input.find(row => row.id === '01-4-0')!.variant_group = 'same'; input.find(row => row.id === '02-4-0')!.variant_group = 'same';
    expect(planDiagnosticBase(pack(), input, context()).result[1].variant_group).not.toBe('same');
  });
  const progress = (): DiagnosticProgress => ({ base: planDiagnosticBase(pack(), items(), context()).result, next_base_index: 1, followups: 0, attempted_item_ids: [], started_at: now, now });
  it('follows three previous abilities, then advances to next base', () => {
    const s = progress();
    for (const [from, to] of [['01-4', '01-3'], ['01-3', '01-2'], ['01-2', '01-1']]) {
      const output = nextDiagnosticFollowup(s, attempt('incorrect', { ability_id: from }), pack(), items(), context());
      expect(output.result.item?.ability_id).toBe(to); s.followups = output.result.followups;
    }
    expect(nextDiagnosticFollowup(s, attempt('incorrect', { ability_id: '01-1' }), pack(), items(), context()).result.item?.ability_id).toBe('02-4');
  });
  it('skips supplements', () => { const p = pack(); p.abilities.find(row => row.id === '01-3')!.is_supplement = true; expect(nextDiagnosticFollowup(progress(), attempt('incorrect'), p, items(), context()).result.item?.ability_id).toBe('01-2'); });
  it('caps followups using config', () => { const c = context(); c.configs.diagnostic.max_followups = 0; expect(nextDiagnosticFollowup(progress(), attempt('incorrect'), pack(), items(), c).trace.reasons).toContain('max_followups'); });
  it('independent success advances base', () => expect(nextDiagnosticFollowup(progress(), attempt(), pack(), items(), context()).result.item?.ability_id).toBe('02-4'));
  it.each([
    { missing: ['01-3'], target: '01-2' },
    { missing: ['01-3', '01-2'], target: '01-1' },
    { missing: ['01-3', '01-2', '01-1'], target: '02-4' },
  ])('skips missing followup items: $missing', ({ missing, target }) => {
    const s = progress();
    const output = nextDiagnosticFollowup(s, attempt('incorrect'), pack(), items().filter(row => !missing.includes(row.ability_id)), context());
    expect(output.result.item?.ability_id).toBe(target);
    expect(output.trace.reasons).toContain(`no_followup_items:${missing.join(',')}`);
    expect(output.result.followups).toBe(target === '02-4' ? s.followups : s.followups + 1);
    expect(output.result.next_base_index).toBe(target === '02-4' ? s.next_base_index + 1 : s.next_base_index);
    expect(output.trace.rule_version).toEqual({ diagnostic: 1, recommendation: 1 });
  });
  it('at the timeout boundary remaining items become no_response', () => {
    const s = progress(); s.now = '2026-10-27T00:15:00Z';
    const result = nextDiagnosticFollowup(s, attempt(), pack(), items(), context()).result;
    expect(result.item).toBeNull(); expect(result.no_response).toHaveLength(5); expect(result.no_response.every(row => row.result === 'no_response')).toBe(true);
  });
  it('before timeout there are no synthetic attempts', () => expect(timeoutDiagnostic(progress().base, now, '2026-10-27T00:14:59Z', context()).result).toEqual([]));
  it('custom timeout setting is honored', () => { const c = context(); c.configs.diagnostic.time_limit_min = 1; expect(timeoutDiagnostic(progress().base, now, '2026-10-27T00:01:00Z', c).result).toHaveLength(6); });
  it('summarizes all abilities and preserves observed dependent evidence', () => {
    const out = summarizeDiagnostic([attempt('incorrect', { ability_id: '01-1' }), attempt('correct_independent', { ability_id: '01-4' }), attempt('correct_independent', { ability_id: '02-4' })], pack(), context());
    expect(out.result).toHaveLength(24);
    expect(out.result.find(row => row.ability_id === '01-1')?.state).toBe('needs_repair');
    for (const id of ['01-2', '01-3']) expect(out.result.find(row => row.ability_id === id)?.state).toBe('unknown');
    expect(out.result.find(row => row.ability_id === '01-4')).toMatchObject({ state: 'learning', evidence: { independent_correct: 1 } });
    expect(out.result.find(row => row.ability_id === '02-4')).toMatchObject({ state: 'learning', evidence: { independent_correct: 1 } });
  });
  it.each(['no_response', 'correct_assisted', 'input_issue', 'pending_review'] as const)('summary handles %s', result => {
    expect(summarizeDiagnostic([attempt(result)], pack(), context()).result.find(row => row.ability_id === '01-4')?.state).toBe(result === 'no_response' ? 'needs_repair' : 'unknown');
  });
  it('does not mutate inputs', () => { const p = pack(), input = items(), before = structuredClone({ p, input }); planDiagnosticBase(p, input, context()); summarizeDiagnostic([attempt()], p, context()); expect({ p, input }).toEqual(before); });
});
