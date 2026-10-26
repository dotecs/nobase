import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse, stringify } from 'yaml';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validatePack, type ContentPackData } from '@/lib/learn/pack-schema';
import type { Database } from '@/lib/database.types';

type Table = Extract<keyof Database['public']['Tables'], `learn_${string}`>;
type Row = Record<string, unknown>;
export function message(error: unknown): string {
  const value = error as { code?: string; message?: string };
  if (['42P01', 'PGRST205'].includes(value?.code ?? '')) return '마이그레이션 미적용 — 대표가 040을 적용한 뒤 이용해 주세요.';
  return value?.message ?? '요청 처리 중 오류가 발생했습니다.';
}
export async function adminClient() {
  const client = await createServerSupabaseClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error('관리자 로그인이 필요합니다.');
  const profile = await client.from('profiles').select('role').eq('user_id', user.id).single();
  if ((profile.data as { role: string } | null)?.role !== 'admin') throw new Error('관리자만 이용할 수 있습니다.');
  return client;
}
export function packPath(packId: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(packId)) throw new Error('잘못된 팩 ID');
  return resolve(process.cwd(), 'content/learn/packs', packId);
}
export async function readRepositoryPack(packId: string) {
  const directory = packPath(packId);
  const read = async (name: string) => parse(await readFile(resolve(directory, `${name}.yaml`), 'utf8'));
  const [pack, units, abilities, edges, goals, materials, misconceptions, diagnostic] = await Promise.all(['pack', 'units', 'abilities', 'edges', 'goals', 'materials', 'misconceptions', 'diagnostic'].map(read));
  const files = (await readdir(resolve(directory, 'items'))).filter(name => /\.ya?ml$/.test(name)).sort();
  const items = (await Promise.all(files.map(async name => parse(await readFile(resolve(directory, 'items', name), 'utf8'))))).flat();
  if (pack.id !== packId) throw new Error('디렉터리와 pack.id 불일치');
  return { pack, units, abilities, edges, goals, materials, misconceptions, diagnostic, items };
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)]));
  return value;
}
export function contentHash(value: unknown) { return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex'); }
function itemContent(row: Row) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !['version', 'created_at'].includes(key)));
}
export function planItem(incoming: Row, existing: Row[]) {
  const latest = existing.filter(row => row.id === incoming.id).sort((a, b) => Number(b.version) - Number(a.version))[0];
  if (latest && contentHash(itemContent(latest)) === contentHash(itemContent(incoming))) return null;
  const content = Object.fromEntries(Object.entries(incoming).filter(([key]) => key !== 'created_at'));
  return { ...content, version: latest ? Number(latest.version) + 1 : 1 };
}
export async function allRows(client: Awaited<ReturnType<typeof adminClient>>, table: Table) {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await client.from(table).select('*').order(table === 'learn_goal_requirements' ? 'goal_id' : 'id').range(offset, offset + 999);
    if (result.error) throw result.error;
    const batch = (result.data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}
export async function importValidated(client: Awaited<ReturnType<typeof adminClient>>, data: ContentPackData) {
  const stats = { added: 0, updated: 0, skipped: 0 };
  const pack = { ...data.pack, checksum: contentHash(data) };
  const groups: [Table, Row[], string[]][] = [
    ['learn_packs', [pack], ['id']], ['learn_units', data.units, ['id']], ['learn_abilities', data.abilities, ['id']],
    ['learn_ability_edges', data.edges, ['source_id', 'target_id', 'type', 'origin']], ['learn_goals', data.goals.goals, ['id']],
    ['learn_goal_requirements', data.goals.requirements, ['goal_id', 'ability_id']], ['learn_materials', data.materials, ['id']],
    ['learn_misconceptions', data.misconceptions, ['id']], ['learn_items', data.items, ['id', 'version']],
    ['learn_diagnostic_scripts', [data.diagnostic], ['goal_id', 'version']],
  ];
  // Preflight all tables before the first write. No production import is run by tooling.
  const snapshots = new Map<Table, Row[]>();
  for (const [table] of groups) snapshots.set(table, await allRows(client, table));
  for (const [table, rows, keys] of groups) {
    const existing = snapshots.get(table)!;
    for (const incoming of rows) {
      let row: Row = { ...incoming };
      const old = existing.find(value => keys.every(key => value[key] === incoming[key]));
      if (table === 'learn_items') {
        const next = planItem(incoming, existing);
        if (!next) { stats.skipped++; continue; }
        const result = await client.from(table).insert(next as never);
        if (result.error) throw result.error;
        existing.push(next); stats.added++; continue;
      }
      if (table === 'learn_packs') {
        row = Object.fromEntries(Object.entries(row).filter(([key]) => !['created_at', 'updated_at', 'imported_at'].includes(key)));
      }
      if (old && Object.keys(row).every(key => contentHash(old[key]) === contentHash(row[key]))) { stats.skipped++; continue; }
      if (table === 'learn_packs') row.imported_at = new Date().toISOString();
      const result = await client.from(table).upsert(row as never, { onConflict: keys.join(',') });
      if (result.error) throw result.error;
      if (old) { Object.assign(old, row); stats.updated++; } else { existing.push(row); stats.added++; }
    }
  }
  return stats;
}
export async function readDatabasePack(client: Awaited<ReturnType<typeof adminClient>>, packId: string) {
  packPath(packId);
  const pack = (await allRows(client, 'learn_packs')).find(row => row.id === packId);
  if (!pack) throw new Error('팩을 먼저 가져오세요.');
  const units = (await allRows(client, 'learn_units')).filter(row => row.pack_id === packId);
  const abilities = (await allRows(client, 'learn_abilities')).filter(row => row.pack_id === packId);
  const abilityIds = new Set(abilities.map(row => row.id));
  const edges = (await allRows(client, 'learn_ability_edges')).filter(row => row.pack_id === packId);
  const goals = (await allRows(client, 'learn_goals')).filter(row => row.pack_id === packId);
  const goalIds = new Set(goals.map(row => row.id));
  const requirements = (await allRows(client, 'learn_goal_requirements')).filter(row => goalIds.has(row.goal_id));
  const materials = (await allRows(client, 'learn_materials')).filter(row => abilityIds.has(row.ability_id));
  const misconceptions = (await allRows(client, 'learn_misconceptions')).filter(row => abilityIds.has(row.ability_id));
  const versions = (await allRows(client, 'learn_items')).filter(row => abilityIds.has(row.ability_id)).sort((a, b) => Number(b.version) - Number(a.version));
  const items = [...new Map(versions.toReversed().map(row => [row.id, row])).values()];
  const diagnostic = (await allRows(client, 'learn_diagnostic_scripts')).filter(row => goalIds.has(row.goal_id)).sort((a, b) => Number(b.version) - Number(a.version))[0];
  return { pack, units, abilities, edges, goals: { goals, requirements }, materials, misconceptions, items, diagnostic };
}
export async function exportItems(packId: string, items: Row[]) {
  const grouped = new Map<string, Row[]>();
  for (const row of items.filter(item => ['reviewed', 'live'].includes(String(item.status)))) {
    const ability = String(row.ability_id);
    if (!/^[a-zA-Z0-9_-]+$/.test(ability)) throw new Error('잘못된 소주제 ID');
    grouped.set(ability, [...(grouped.get(ability) ?? []), row]);
  }
  const local = process.env.NODE_ENV === 'development' && !process.env.VERCEL;
  let text = '';
  for (const [ability, rows] of grouped) {
    const yaml = stringify(rows);
    text += `# items/${ability}.yaml\n${yaml}\n---\n`;
    if (local) { const directory = resolve(packPath(packId), 'items'); await mkdir(directory, { recursive: true }); await writeFile(resolve(directory, `${ability}.yaml`), yaml); }
  }
  return { text, local };
}
export { validatePack };
