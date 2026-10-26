import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { registerSource, saveDraftReview, approveDraft } from '@/app/(admin)/admin/learn/authoring/actions';
import { exportPack } from '@/app/(admin)/admin/learn/packs/actions';
import { importValidated, readRepositoryPack, validatePack } from '@/app/(admin)/admin/learn/packs/server';
import { processExtraction } from './worker';
import { MockProvider } from './mock';
import type { Database } from '@/lib/database.types';
import { uploadAuthoringImage } from '@/lib/storage';

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
            else list.push({ id: randomUUID(), created_at: '2026-10-26T00:00:00Z', status: table === 'learn_jobs' ? 'queued' : 'draft', ...structuredClone(value) });
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
        eq(key: string, value: unknown) { filters.push(row => row[key] === value); return this; },
        in(key: string, values: unknown[]) { filters.push(row => values.includes(row[key])); return this; },
        range(a: number, b: number) { start = a; end = b + 1; return this; },
        insert(value: Row | Row[]) { mode = 'insert'; payload = Array.isArray(value) ? value : [value]; return this; },
        upsert(value: Row | Row[], options: { onConflict: string; ignoreDuplicates?: boolean }) { mode = 'upsert'; payload = Array.isArray(value) ? value : [value]; conflict = options.onConflict; ignore = !!options.ignoreDuplicates; return this; },
        update(value: Row) { mode = 'update'; payload = [value]; return this; },
        async single() { const result = execute(); return { ...result, data: result.data[0] ?? null }; },
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
      const count = new Set(rows('learn_items').filter(row => row.ability_id === input.p_ability_id).map(row => row.id)).size;
      const item = { id: `${input.p_ability_id}-${String(count + 1).padStart(2, '0')}`, version: 1, ability_id: input.p_ability_id, usage: input.p_usage, ...input.p_item, hints: [], rubric: [], required_abilities: [], misconception_ids: [], status: 'reviewed', source_draft_id: draft.id };
      rows('learn_items').push(item); draft.status = 'approved'; return { data: item, error: null };
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
