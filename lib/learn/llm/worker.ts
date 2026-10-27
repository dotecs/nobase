import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { createProvider, type LlmProvider } from './provider';
import { extractDrafts, type Ability, type Source } from './authoring';
import type { Database } from '@/lib/database.types';
import { EnrichmentPayload } from './schema';
import { verifyEnrichment } from './enrichment';

type Job = Database['public']['Tables']['learn_jobs']['Row'];
type Client = ReturnType<typeof createAdminSupabaseClient>;
export async function processEnrichment(job: Job, client: Client, provider: LlmProvider, signal: AbortSignal) {
  const draftResult = await client.from('learn_item_drafts').select('*').eq('id', job.ref_id).abortSignal(signal).single();
  const draft = draftResult.data as Database['public']['Tables']['learn_item_drafts']['Row'] | null;
  if (draftResult.error || !draft || draft.status !== 'approved') throw new Error('Approved draft required');
  if ((draft.enrichment as { applied_at?: string } | null)?.applied_at) throw new Error('Already applied');
  const items = await client.from('learn_items').select('*').eq('source_draft_id', draft.id).order('version', { ascending: false }).abortSignal(signal);
  if (items.error) throw items.error;
  const item = (items.data as Database['public']['Tables']['learn_items']['Row'][] | null)?.find(row => row.variant_group === row.id);
  if (!item) throw new Error('Seed unavailable');
  const abilities = await client.from('learn_abilities').select('id,name,action').eq('pack_id', 'root-math').abortSignal(signal);
  if (abilities.error || !abilities.data?.length) throw new Error('Import root-math pack first');
  const abilityRows = abilities.data as { id: string; name: string; action: string }[];
  const payload = EnrichmentPayload.parse({ item: { stem_md: item.stem_md, answer_type: item.answer_type, answer_spec: item.answer_spec }, abilities: abilityRows.map(({ id, name, action }) => ({ id, name, action })) });
  const raw = await provider.completeJson({ task: 'item_enrich', payload, signal });
  const enrichment = verifyEnrichment(raw, item, abilityRows, provider);
  signal.throwIfAborted();
  const saved = await client.from('learn_item_drafts').update({ enrichment } as never).eq('id', draft.id).eq('status', 'approved').is('enrichment->>applied_at', null).select('id').abortSignal(signal);
  if (saved.error || !saved.data?.length) throw saved.error ?? new Error('Already applied');
  return { draft_ids: [draft.id], count: 1, is_mock: provider.isMock };
}
export async function processExtraction(job: Job, client: Client, provider: LlmProvider, signal: AbortSignal) {
  const sourceResult = await client.from('learn_item_sources').select('*').eq('id', job.ref_id).abortSignal(signal).single();
  const source = sourceResult.data as Source | null;
  if (sourceResult.error || !source) throw new Error('Source unavailable');
  const { data: file, error } = await client.storage.from('learn-authoring').download(source.storage_path);
  if (error || !file || file.size > 15 * 1024 * 1024) throw new Error('Image unavailable or too large');
  signal.throwIfAborted();
  const bytes = Buffer.from(await file.arrayBuffer());
  const jpeg = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  const abilityResult = await client.from('learn_abilities').select('id,name').eq('pack_id', 'root-math').abortSignal(signal);
  if (abilityResult.error || !abilityResult.data?.length) throw new Error('Import root-math pack first');
  const drafts = await extractDrafts(source.id, { base64: jpeg.toString('base64'), mediaType: 'image/jpeg', signal }, provider, abilityResult.data as Ability[]);
  signal.throwIfAborted();
  const result = await client.from('learn_item_drafts').upsert(drafts as never, { onConflict: 'id', ignoreDuplicates: true }).abortSignal(signal);
  if (result.error) throw result.error;
  return { draft_ids: drafts.map(draft => draft.id), count: drafts.length, is_mock: provider.isMock };
}
export async function runJobs() {
  const client = createAdminSupabaseClient(), worker = randomUUID();
  const signal = AbortSignal.timeout(55_000);
  const jobs: Job[] = [];
  for (const kind of ['item_extract', 'item_enrich'] as const) {
   while (jobs.length < 3) {
    const result = await client.rpc('learn_claim_job', { p_kind: kind, p_worker: worker } as never).abortSignal(signal);
    if (result.error) throw result.error;
    const job = (Array.isArray(result.data) ? result.data[0] : result.data) as Job | null;
    if (!job?.id) break;
    jobs.push(job);
   }
  }
  // At most three concurrent jobs share the request deadline (maxDuration=60).
  return Promise.all(jobs.map(async job => {
    try {
      const provider = await createProvider(job.kind);
      const result = await (job.kind === 'item_enrich' ? processEnrichment : processExtraction)(job, client, provider, signal);
      const saved = await client.from('learn_jobs').update({ status: 'succeeded', result, locked_at: null, locked_by: null } as never).eq('id', job.id).eq('locked_by', worker);
      if (saved.error) throw saved.error;
      return { id: job.id, status: 'succeeded', ...result };
    } catch {
      const status = job.attempts < job.max_attempts ? 'queued' : 'failed';
      await client.from('learn_jobs').update({ status, error: 'Authoring job failed or timed out. Check input, provider configuration and migration; retry with Process now.', locked_at: null, locked_by: null } as never).eq('id', job.id).eq('locked_by', worker);
      return { id: job.id, status };
    }
  }));
}
