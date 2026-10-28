import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { registerSource, saveDraftReview, approveDraft, appendApprovedVariants, generateDraftVariants, toggleDraftVariant, enqueueEnrichment, applyEnrichment } from '@/app/(admin)/admin/learn/authoring/actions';
import { exportPack } from '@/app/(admin)/admin/learn/packs/actions';
import { importValidated, readRepositoryPack, validatePack } from '@/app/(admin)/admin/learn/packs/server';
import { processExtraction, runJobs } from './worker';
import { validateEnrichmentSelection, verifyEnrichment } from './enrichment';
import { StoredEnrichment } from './schema';
import { MockProvider } from './mock';
import type { Database } from '@/lib/database.types';
import { uploadAuthoringImage } from '@/lib/storage';
import { VariantRules, validateStoredVariants } from '../mathcheck/templatize';

const current = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('@/lib/supabase-server', () => ({ createServerSupabaseClient: async () => current.client }));
vi.mock('@/lib/supabase-client', () => ({ createClientSupabaseClient: () => current.client }));
vi.mock('@/lib/supabase-admin', () => ({ createAdminSupabaseClient: () => { if (!current.client) throw new Error('Production access prohibited'); return current.client; } }));
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
      let sortKey = '', ascending = true;
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
        const filtered = list.filter(row => filters.every(filter => filter(row)));
        if (sortKey) filtered.sort((a, b) => (a[sortKey]! < b[sortKey]! ? -1 : a[sortKey] === b[sortKey] ? 0 : 1) * (ascending ? 1 : -1));
        const selected = filtered.slice(start, end);
        if (mode === 'update') { selected.forEach(row => Object.assign(row, structuredClone(payload[0]))); mode = 'read'; }
        return { data: structuredClone(selected), error: null };
      };
      const query = {
        select() { return this; }, order(key: string, options: { ascending: boolean } = { ascending: true }) { sortKey = key; ascending = options.ascending; return this; }, abortSignal() { return this; },
        is(key: string, value: unknown) { filters.push(row => key === 'enrichment->>applied_at' ? ((row.enrichment as Row | null)?.applied_at ?? null) === value : row[key] === value); return this; },
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
    rpc(name: string, input: { p_draft_id?: string; p_ability_id?: string; p_usage?: string; p_item?: Row; p_selection?: unknown; p_kind?: string; p_worker?: string }) {
     const execute = async () => {
      rpcCalls.push(name);
      if (name === 'learn_claim_job') {
        const job = rows('learn_jobs').find(row => row.kind === input.p_kind && row.status === 'queued');
        if (job) Object.assign(job, { status: 'running', attempts: 1, max_attempts: 3, locked_by: input.p_worker });
        return { data: job ?? null, error: null };
      }
      if (name === 'learn_apply_enrichment') {
        const draft = rows('learn_item_drafts').find(row => row.id === input.p_draft_id)!;
        try {
          const { enrichment, selected } = validateEnrichmentSelection(String(draft.status), draft.enrichment, input.p_selection);
          const seed = rows('learn_items').filter(row => row.source_draft_id === draft.id && row.variant_group === row.id).sort((a, b) => Number(b.version) - Number(a.version))[0];
          if (!seed) throw new Error('씨앗 문항 없음');
          const start = rows('learn_misconceptions').filter(row => row.ability_id === seed.ability_id).length;
          const misconceptions = selected.misconceptions.map((index, offset) => ({ id: `${seed.ability_id}-m${String(start + offset + 1).padStart(2, '0')}`, ability_id: seed.ability_id, pattern: enrichment.misconceptions[index].pattern, suggests: [seed.ability_id], coach_note: enrichment.misconceptions[index].explanation }));
          const item = { ...structuredClone(seed), version: Number(seed.version) + 1, hints: selected.hints.map(index => enrichment.hints[index]), misconception_ids: [...new Set([...(seed.misconception_ids as string[]), ...misconceptions.map(row => row.id)])] };
          const count = new Set(rows('learn_items').filter(row => row.ability_id === seed.ability_id).map(row => row.id)).size;
          const reason = { ...seed, id: `${seed.ability_id}-${String(count + 1).padStart(2, '0')}`, version: 1, stem_md: enrichment.reason_item.stem_md, answer_type: 'text', answer_spec: { type: 'text', model_answer_md: enrichment.reason_item.model_answer_md }, hints: [], rubric: enrichment.reason_item.rubric, usage: 'assessment', required_abilities: [seed.ability_id] };
          rows('learn_misconceptions').push(...misconceptions); rows('learn_items').push(item);
          if (selected.reason_item) rows('learn_items').push(reason);
          draft.enrichment = { ...enrichment, applied_at: new Date().toISOString() };
          return { data: item, error: null };
        } catch (error) { return { data: null, error: { message: (error as Error).message } }; }
      }
      if (name === 'learn_append_variants') {
        const draft = rows('learn_item_drafts').find(row => row.id === input.p_draft_id)!;
        const seed = rows('learn_items').find(row => row.source_draft_id === draft.id && row.id === row.variant_group);
        const params = (draft.template as { params?: { source_stem?: string; answer_type?: string } } | null)?.params;
        if (draft.status !== 'approved' || !seed || draft.answer_verified_by !== 'program' || !draft.answer_spec || params?.source_stem !== draft.stem_md || params?.answer_type !== draft.answer_type || seed.stem_md !== draft.stem_md) return { data: null, error: { message: 'Invalid approved template' } };
        const enabled = (draft.variants as Row[]).filter(row => row.enabled);
        if (enabled.some(row => !row.answer_spec)) return { data: null, error: { message: 'Unverified variant' } };
        let added = 0;
        for (const variant of enabled) {
          if (rows('learn_items').some(row => row.variant_group === seed.variant_group && row.stem_md === variant.stem_md)) continue;
          const n = Math.max(...rows('learn_items').filter(row => row.ability_id === seed.ability_id).map(row => Number(String(row.id).split('-').at(-1)))) + 1;
          rows('learn_items').push({ ...seed, ...variant, id: `${seed.ability_id}-${String(n).padStart(2, '0')}`, version: 1 });
          added++;
        }
        return { data: added, error: null };
      }
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
     };
     const promise = execute();
     return Object.assign(promise, { abortSignal: () => promise });
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
  it('연속 체크 변경을 저장한 뒤 표시 개수와 실제 승인 개수가 일치한다',async()=>{
    const { VariantSelection }=await import('../variant-selection');
    const memory=variantFixture();await generateDraftVariants(memory.id);
    const selection=new VariantSelection((memory.draft.variants as Row[]).map(row=>row.enabled as boolean),(index,enabled)=>toggleDraftVariant(memory.id,index,enabled),()=>{});
    await Promise.all([selection.toggle(0,false),selection.toggle(1,false),selection.toggle(0,true)]);
    expect(selection.getSnapshot()).toMatchObject({pending:0,error:null});
    const included=selection.getSnapshot().flags.filter(Boolean).length;expect(included).toBe(4);
    expect((memory.draft.variants as Row[]).filter(row=>row.enabled)).toHaveLength(included);
    expect(await approveDraft({draftId:memory.id,saveImage:false})).not.toHaveProperty('error');expect(memory.rows('learn_items')).toHaveLength(included+1);
  });
  it('주입 의심 초안은 본문을 수정해도 명시적 코치 확인 없이는 검증 상태를 올릴 수 없다', async () => {
    const memory = variantFixture();
    Object.assign(memory.draft, { extract: { original: { needs_figure: false, injection_suspected: true }, warning: 'injection_suspected' }, status: 'needs_coach', answer_spec: null, answer_verified_by: null });
    const input = { draftId: memory.id, stem_md: '1/2+1/3', answer_type: 'fraction', ability_id: '04-3', usage: 'assessment', coachConfirmed: false, saveImage: false };
    expect(await saveDraftReview(input)).toHaveProperty('error');
    expect(memory.draft.answer_verified_by).toBeNull();
    expect(await saveDraftReview({ ...input, coachConfirmed: true, coachAnswer: { type: 'fraction', value: '5/6' } })).not.toHaveProperty('error');
    expect(memory.draft.answer_verified_by).toBe('coach');
  });
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
    expect(await generateDraftVariants(memory.id)).not.toHaveProperty('error');
    expect(await toggleDraftVariant(memory.id, 0, false)).not.toHaveProperty('error');
  });
  it('승인 후 enabled 3개 추가: 같은 그룹·연번·반복 적용 중복 없음', async () => {
    const memory = variantFixture();
    await approveDraft({ draftId: memory.id, saveImage: false });
    expect(await generateDraftVariants(memory.id, 5)).not.toHaveProperty('error');
    await toggleDraftVariant(memory.id, 1, false);
    await toggleDraftVariant(memory.id, 3, false);
    expect(await appendApprovedVariants(memory.id)).toHaveProperty('message', '3개 변형을 추가했습니다. 기존 문항은 건너뜁니다.');
    const items = memory.rows('learn_items');
    expect(items.map(row => row.id)).toEqual(['04-3-01', '04-3-02', '04-3-03', '04-3-04']);
    expect(items.every(row => row.variant_group === '04-3-01')).toBe(true);
    expect(await appendApprovedVariants(memory.id)).toHaveProperty('message', '0개 변형을 추가했습니다. 기존 문항은 건너뜁니다.');
    expect(items).toHaveLength(4);
    (memory.draft.variants as Row[])[0].answer_spec = null;
    expect(await appendApprovedVariants(memory.id)).toHaveProperty('error');
    expect(items).toHaveLength(4);
  });
  it('승인 전·씨앗 변경·미선택 변형은 추가 불가', async () => {
    const memory = variantFixture();
    await generateDraftVariants(memory.id, 3);
    expect(await appendApprovedVariants(memory.id)).toHaveProperty('error');
    await approveDraft({ draftId: memory.id, saveImage: false });
    memory.draft.stem_md = '1/3+1/4';
    expect(await appendApprovedVariants(memory.id)).toHaveProperty('error');
    memory.draft.stem_md = '1/2+1/3';
    for (const row of memory.draft.variants as Row[]) row.enabled = false;
    expect(await appendApprovedVariants(memory.id)).toHaveProperty('error');
  });
  it('045는 관리자·잠금·원문·정답 가드와 중복 건너뛰기를 정의한다', () => {
    const sql = readFileSync('supabase/migrations/045_learn_append_variants.sql', 'utf8');
    for (const guard of ['security invoker', 'public.is_admin()', 'for update', "draft.status <> 'approved'", 'source_stem', "variant->'answer_spec' is null", 'pg_advisory_xact_lock(hashtext(seed.ability_id))', 'then continue', 'from public, anon', 'to authenticated']) expect(sql).toContain(guard);
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

describe('enrichment generation and selected application', () => {
  async function approvedFixture() {
    const memory = variantFixture();
    memory.rows('learn_abilities').push({ id: '04-3', pack_id: 'root-math', name: '분수의 덧셈', action: '통분하여 계산한다' });
    memory.rows('learn_rule_configs').push({ key: 'llm', version: 1, config: { default: 'mock' }, active_from: '2020-01-01T00:00:00Z' });
    await approveDraft({ draftId: memory.id, saveImage: false });
    return memory;
  }
  it('mock 보강 생성 → 선택 적용, 씨앗 v1 보존·v2와 오개념 2개·이유 문항', async () => {
    const memory = await approvedFixture(), seed = structuredClone(memory.rows('learn_items')[0]);
    expect(await enqueueEnrichment(memory.id)).not.toHaveProperty('error');
    expect(await enqueueEnrichment(memory.id)).toHaveProperty('error');
    expect(await runJobs()).toMatchObject([{ status: 'succeeded' }]);
    const enrichment = StoredEnrichment.parse(memory.draft.enrichment);
    expect(enrichment.misconceptions).toHaveLength(2);
    expect(enrichment.misconceptions.every(row => row.verified)).toBe(true);
    expect(enrichment.ability_candidates).toEqual({ llm: ['04-3'], rule: ['04-3'] });
    expect(memory.rows('learn_items')).toEqual([seed]);
    expect(await applyEnrichment(memory.id, { hints: [], misconceptions: [], reason_item: false })).toHaveProperty('error');
    const selection = { hints: [0, 1], misconceptions: [0, 1], reason_item: true };
    expect(await applyEnrichment(memory.id, selection)).not.toHaveProperty('error');
    expect(memory.rows('learn_items')[0]).toEqual(seed);
    expect(memory.rows('learn_items')[1]).toMatchObject({ id: '04-3-01', version: 2, hints: enrichment.hints, misconception_ids: ['04-3-m01', '04-3-m02'] });
    expect(memory.rows('learn_items')[2]).toMatchObject({ id: '04-3-02', version: 1, answer_type: 'text', variant_group: '04-3-01', required_abilities: ['04-3'] });
    expect(memory.rows('learn_misconceptions').map(row => row.id)).toEqual(['04-3-m01', '04-3-m02']);
    expect(await memory.client.rpc('learn_apply_enrichment', { p_draft_id: memory.id, p_selection: selection })).toMatchObject({ error: { message: '이미 적용된 보강' } });
    expect(await enqueueEnrichment(memory.id)).toHaveProperty('error');
  });
  it('미승인·미검증 선택은 RPC 가드에서 차단되고 아무것도 적용하지 않는다', async () => {
    const memory = await approvedFixture();
    await enqueueEnrichment(memory.id); await runJobs();
    const enrichment = StoredEnrichment.parse(memory.draft.enrichment);
    enrichment.misconceptions[0].verified = false; memory.draft.enrichment = enrichment;
    const input = { p_draft_id: memory.id, p_selection: { hints: [], misconceptions: [0], reason_item: false } };
    expect(await memory.client.rpc('learn_apply_enrichment', input)).toMatchObject({ error: { message: '미검증 오개념 또는 잘못된 선택' } });
    memory.draft.status = 'extracted';
    expect(await memory.client.rpc('learn_apply_enrichment', input)).toMatchObject({ error: { message: '승인된 초안만 보강할 수 있습니다' } });
    expect(memory.rows('learn_items')).toHaveLength(1); expect(memory.rows('learn_misconceptions')).toHaveLength(0);
  });
  it('두 kind를 추출 우선으로 claim하고 총 3개까지만 처리한다', async () => {
    const memory = await approvedFixture();
    memory.rows('learn_jobs').push({ id: randomUUID(), kind: 'item_extract', ref_id: randomUUID(), status: 'queued' });
    await enqueueEnrichment(memory.id);
    const results = await runJobs();
    expect(results).toHaveLength(2);
    expect(results[1].status).toBe('succeeded');
    expect(memory.rpcCalls.filter(name => name === 'learn_claim_job')).toHaveLength(4);
    memory.rows('learn_jobs').length = 0;
    for (let i = 0; i < 4; i++) memory.rows('learn_jobs').push({ id: randomUUID(), kind: 'item_extract', ref_id: randomUUID(), status: 'queued' });
    await enqueueEnrichment(memory.id);
    expect(await runJobs()).toHaveLength(3);
    expect(memory.rows('learn_jobs')[3].attempts).toBeUndefined();
    expect(memory.rows('learn_jobs')[4].status).toBe('queued');
  });
  it('정답과 동치인 값은 제외하고 파싱 불가 후보는 적용 불가로 남긴다', async () => {
    const memory = await approvedFixture(), provider = new MockProvider();
    const payload = { item: memory.rows('learn_items')[0], abilities: [] };
    const raw = await provider.completeJson({ task: 'item_enrich', payload: { item: { stem_md: payload.item.stem_md, answer_type: 'fraction', answer_spec: payload.item.answer_spec }, abilities: [] } }) as { misconceptions: Row[] };
    raw.misconceptions = [{ pattern: '동치', wrong_value: '10/12', explanation: '제외' }, { pattern: '파싱 불가', wrong_value: '모르겠다', explanation: '확인 필요' }];
    const result = verifyEnrichment(raw, memory.rows('learn_items')[0] as Database['public']['Tables']['learn_items']['Row'], [], provider);
    expect(result.misconceptions).toEqual([{ pattern: '파싱 불가', wrong_value: '모르겠다', explanation: '확인 필요', verified: false }]);
  });
});
