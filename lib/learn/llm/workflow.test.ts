import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { registerSource, saveDraftReview, approveDraft, generateDraftVariants, toggleDraftVariant } from '@/app/(admin)/admin/learn/authoring/actions';
import { exportPack } from '@/app/(admin)/admin/learn/packs/actions';
import { importValidated, readRepositoryPack, validatePack } from '@/app/(admin)/admin/learn/packs/server';
import { processExtraction } from './worker';
import { MockProvider } from './mock';
import type { Database } from '@/lib/database.types';
import { uploadAuthoringImage } from '@/lib/storage';
import { VariantRules, validateStoredVariants } from '../mathcheck/templatize';

const current = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: async () => current.client }));
vi.mock('@/lib/supabase-client', () => ({ createClientSupabaseClient: () => current.client }));
vi.mock('@/lib/supabase-admin', () => ({ createAdminSupabaseClient: () => { throw new Error('Production access prohibited'); } }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
type Row = Record<string, unknown>;
const userId = '00000000-0000-4000-8000-000000000001';

function memoryDatabase(image: Uint8Array) {
  const tables = new Map<string, Row[]>([['profiles', [{ user_id: userId, role: 'admin' }]]]);
  const rpcCalls: string[] = [];
  const uploaded = new Set<string>();
  const rows = (table: string) => { if (!tables.has(table)) tables.set(table, []); return tables.get(table)!; };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) },
    storage: { from: () => ({
      upload: async (path: string) => { uploaded.add(path); return { data: { path }, error: null }; },
      list: async (path: string, options: { search: string }) => ({ data: uploaded.has(`${path}/${options.search}`) ? [{ name: options.search }] : [], error: null }),
      download: async (path: string) => ({ data: uploaded.has(path) ? new Blob([new Uint8Array(image)], { type: 'image/png' }) : null, error: null }),
    }) },
    from(table: string) {
      let mode = 'read', payload: Row[] = [], conflict = 'id', ignore = false;
      const filters: ((row: Row) => boolean)[] = [];
      let start = 0, end = Infinity;
      const execute = () => {
        const list = rows(table);
        if (mode === 'insert' || mode === 'upsert') {
          for (const value of payload) {
            const old = mode === 'upsert' && list.find(row => conflict.split(',').every(key => row[key] === value[key]));
            if (old) { if (!ignore) Object.assign(old, structuredClone(value)); }
            else list.push({ id: randomUUID(), created_at: '2026-10-26T00:00:00Z', status: table === 'learn_jobs' ? 'queued' : 'draft', ...(table === 'learn_item_drafts' ? { variants: [], template: null } : {}), ...structuredClone(value) });
          }
          mode = 'read';
          return { data: list.slice(-payload.length), error: null };
        }
        const selected = list.filter(row => filters.every(filter => filter(row))).slice(start, end);
        if (mode === 'update') { selected.forEach(row => Object.assign(row, structuredClone(payload[0]))); mode = 'read'; }
        return { data: structuredClone(selected), error: null };
      };
      const query = {
        select() { return this; }, order() { return this; }, abortSignal() { return this; },
        eq(key: string, value: unknown) { filters.push(row => ['variants', 'template'].includes(key) ? JSON.stringify(row[key]) === value : row[key] === value); return this; },
        lte(key: string, value: string) { filters.push(row => String(row[key]) <= value); return this; },
        limit(count: number) { end = count; return this; },
        in(key: string, values: unknown[]) { filters.push(row => values.includes(row[key])); return this; },
        range(a: number, b: number) { start = a; end = b + 1; return this; },
        insert(value: Row | Row[]) { mode = 'insert'; payload = Array.isArray(value) ? value : [value]; return this; },
        upsert(value: Row | Row[], options: { onConflict: string; ignoreDuplicates?: boolean }) { mode = 'upsert'; payload = Array.isArray(value) ? value : [value]; conflict = options.onConflict; ignore = !!options.ignoreDuplicates; return this; },
        update(value: Row) { mode = 'update'; payload = [value]; return this; },
        async single() { const result = execute(); return { ...result, data: result.data[0] ?? null }; },
        async maybeSingle() { const result = execute(); return { ...result, data: result.data[0] ?? null }; },
        then(resolve: (value: unknown) => unknown) { return Promise.resolve(execute()).then(resolve); },
      };
      return query;
    },
    async rpc(name: string, input: { p_draft_id: string; p_ability_id: string; p_usage: string; p_item: Row }) {
      rpcCalls.push(name);
      if (name !== 'learn_approve_draft') throw new Error('Unexpected RPC');
      const draft = rows('learn_item_drafts').find(row => row.id === input.p_draft_id)!;
      if (!['extracted', 'needs_coach'].includes(String(draft.status))) return { data: null, error: { message: '이미 처리된 초안' } };
      if (!draft.answer_verified_by) return { data: null, error: { message: '정답 미확인' } };
      const enabled = ((draft.variants ?? []) as Row[]).filter(variant => variant.enabled === true);
      if (enabled.some(variant => variant.answer_spec == null)) return { data: null, error: { message: '변형 정답 미확인' } };
      if (enabled.length && !draft.template) return { data: null, error: { message: '변형 템플릿이 없습니다' } };
      const count = new Set(rows('learn_items').filter(row => row.ability_id === input.p_ability_id).map(row => row.id)).size;
      const seedId = `${input.p_ability_id}-${String(count + 1).padStart(2, '0')}`;
      const item = { id: seedId, version: 1, ability_id: input.p_ability_id, usage: input.p_usage, ...input.p_item, hints: [], rubric: [], required_abilities: [], misconception_ids: [], status: 'reviewed', source_draft_id: draft.id, variant_group: seedId };
      const variantItems = enabled.map((variant, index) => ({ ...item, id: `${input.p_ability_id}-${String(count + index + 2).padStart(2, '0')}`, stem_md: variant.stem_md, answer_type: variant.answer_type, answer_spec: variant.answer_spec, usage: variant.usage }));
      if (draft.template) rows('learn_item_templates').push({ ...draft.template as Row, ability_id: input.p_ability_id, created_from_draft_id: draft.id, status: 'reviewed' });
      rows('learn_items').push(item, ...variantItems); draft.status = 'approved'; return { data: item, error: null };
    },
  };
  return { client, tables, rows, rpcCalls };
}

describe('mock authoring end-to-end with in-memory persistence', () => {
  it('3개 이미지 등록 → 작업 → 검증 → 승인 → YAML 내보내기, 중복 승인은 오류', async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer();
    const memory = memoryDatabase(png); current.client = memory.client;
    const db = memory.client as unknown as Parameters<typeof importValidated>[0];
    const pack = validatePack(await readRepositoryPack('root-math')).data!;
    await importValidated(db, pack);
    for (let index = 0; index < 3; index++) {
      const uploaded = await uploadAuthoringImage(userId, new File([new Uint8Array(png)], `${index}.png`, { type: 'image/png' }));
      expect(uploaded.error).toBeNull();
      expect(await registerSource({ storagePath: uploaded.storagePath, origin: 'book', note: 'mock fixture' })).not.toHaveProperty('error');
      const job = memory.rows('learn_jobs')[index] as Database['public']['Tables']['learn_jobs']['Row'];
      await processExtraction(job, memory.client as unknown as Parameters<typeof processExtraction>[1], new MockProvider(), new AbortController().signal);
      const draft = memory.rows('learn_item_drafts')[index];
      expect(draft.answer_verified_by).toBe('program');
      expect(await saveDraftReview({ draftId: draft.id, stem_md: draft.stem_md, answer_type: 'fraction', ability_id: '04-3', usage: 'assessment', coachConfirmed: false, saveImage: false })).not.toHaveProperty('error');
      expect(await approveDraft({ draftId: String(draft.id), saveImage: false })).not.toHaveProperty('error');
      expect(await approveDraft({ draftId: String(draft.id), saveImage: false })).toMatchObject({ error: '이미 처리된 초안' });
    }
    expect(memory.rows('learn_items')).toHaveLength(3);
    expect(memory.rows('learn_items').map(row => row.id)).toEqual(['04-3-01', '04-3-02', '04-3-03']);
    const exported = await exportPack('root-math');
    expect(exported).not.toHaveProperty('error'); expect(exported.download).toContain('items/04-3.yaml'); expect(exported.download?.match(/status: reviewed/g)).toHaveLength(3);
    expect(memory.rpcCalls).toHaveLength(6);
  });
  it('RPC 상태 가드는 검증되지 않은 초안을 차단한다', async () => {
    const memory = memoryDatabase(new Uint8Array());
    memory.rows('learn_item_drafts').push({ id: userId, status: 'needs_coach', answer_verified_by: null });
    expect(await memory.client.rpc('learn_approve_draft', { p_draft_id: userId, p_ability_id: '04-3', p_usage: 'assessment', p_item: {} })).toMatchObject({ error: { message: '정답 미확인' } });
    expect(memory.rows('learn_items')).toHaveLength(0);
  });
});

const variantRules = VariantRules.parse(JSON.parse(readFileSync('supabase/migrations/040_learn_content.sql', 'utf8').match(/\('variants', 1, '([^']+)'::jsonb\)/)![1]));
function variantFixture() {
  const memory = memoryDatabase(new Uint8Array()); current.client = memory.client;
  const id = randomUUID(), sourceId = randomUUID();
  memory.rows('learn_item_sources').push({ id: sourceId, origin: 'own', storage_path: 'test.png' });
  memory.rows('learn_rule_configs').push({ key: 'variants', version: 1, config: variantRules, active_from: '2020-01-01T00:00:00Z' });
  const draft = { id, source_id: sourceId, stem_md: '1/2+1/3', answer_type: 'fraction', answer_spec: { type: 'fraction', value: '5/6', require_reduced: true }, answer_verified_by: 'program', status: 'extracted', ability_id: '04-3', usage_suggested: 'assessment', variants: [], template: null, extract: { original: { needs_figure: false } } };
  memory.rows('learn_item_drafts').push(draft);
  return { ...memory, id, draft: draft as Row };
}
describe('server variants and transactional approval', () => {
  it('enabled 3·disabled 2 승인 시 씨앗 포함 4개·같은 그룹·연속 번호', async () => {
    const memory = variantFixture();
    expect(await generateDraftVariants(memory.id)).not.toHaveProperty('error');
    expect(validateStoredVariants(memory.draft.variants)).toHaveLength(5);
    expect(await toggleDraftVariant(memory.id, 1, false)).not.toHaveProperty('error');
    expect(await toggleDraftVariant(memory.id, 3, false)).not.toHaveProperty('error');
    expect(await approveDraft({ draftId: memory.id, saveImage: false })).not.toHaveProperty('error');
    const items = memory.rows('learn_items');
    expect(items).toHaveLength(4);
    expect(items.map(row => row.id)).toEqual(['04-3-01', '04-3-02', '04-3-03', '04-3-04']);
    expect(items.every(row => row.variant_group === '04-3-01')).toBe(true);
    expect(items.map(row => row.usage)).toEqual(['assessment', 'practice', 'review', 'assessment']);
    expect(memory.rows('learn_item_templates')).toHaveLength(1);
    expect(await generateDraftVariants(memory.id)).toHaveProperty('error');
    expect(await toggleDraftVariant(memory.id, 0, false)).toHaveProperty('error');
  });
  it('기본 변형 5개를 모두 승인하면 수행형 6개 조건을 만족한다', async () => {
    const memory = variantFixture();
    expect(await generateDraftVariants(memory.id, 5)).not.toHaveProperty('error');
    expect(await approveDraft({ draftId: memory.id, saveImage: false })).not.toHaveProperty('error');
    const pack = validatePack(await readRepositoryPack('root-math')).data!;
    const unit = pack.units.find(row => row.id === 'u04')!;
    const ability = pack.abilities.find(row => row.id === '04-3')!;
    const result = validatePack({ ...pack, pack: { ...pack.pack, status: 'reviewed' }, units: [{ ...unit, order: 1 }], abilities: [{ ...ability, order_in_unit: 1 }], edges: [], materials: [], items: memory.rows('learn_items'), goals: { goals: pack.goals.goals, requirements: pack.goals.requirements.filter(row => row.ability_id === '04-3') }, diagnostic: { ...pack.diagnostic, base_abilities: ['04-3'] } });
    expect(result.errors).toEqual([]); expect(result.warnings).toEqual([]);
  });
  it('answer_spec null 변형이면 씨앗·템플릿·변형을 모두 저장하지 않는다', async () => {
    const memory = variantFixture();
    await generateDraftVariants(memory.id, 5);
    (memory.draft.variants as Row[])[1].answer_spec = null;
    expect(await approveDraft({ draftId: memory.id, saveImage: false })).toEqual({ error: '변형 정답 미확인' });
    expect(memory.rows('learn_items')).toHaveLength(0); expect(memory.rows('learn_item_templates')).toHaveLength(0);
    expect(memory.draft.status).toBe('extracted');
  });
  it('씨앗 수정은 이전 템플릿·변형을 무효화한다', async () => {
    const memory = variantFixture();
    await generateDraftVariants(memory.id, 3);
    expect(await saveDraftReview({ draftId: memory.id, stem_md: '1/3+1/4', answer_type: 'fraction', ability_id: '04-3', usage: 'assessment', coachConfirmed: false, saveImage: false })).not.toHaveProperty('error');
    expect(memory.draft.template).toBeNull(); expect(memory.draft.variants).toEqual([]);
  });
  it('규칙 누락은 오류이며 클라이언트가 변형 본문을 토글 인자로 보낼 수 없다', async () => {
    const memory = variantFixture();
    memory.tables.set('learn_rule_configs', []);
    expect(await generateDraftVariants(memory.id)).toHaveProperty('error');
    expect(await toggleDraftVariant(memory.id, 0, { stem_md: '42' } as unknown as boolean)).toHaveProperty('error');
    expect(memory.draft.variants).toEqual([]);
  });
});
