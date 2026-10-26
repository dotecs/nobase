import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import { createProvider, type LlmProvider } from './provider';
import { extractDrafts, type Ability, type Source } from './authoring';
import type { Database } from '@/lib/database.types';

type Job = Database['public']['Tables']['learn_jobs']['Row'];
type Client = ReturnType<typeof createAdminSupabaseClient>;
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
  for (let index = 0; index < 3; index++) {
    const result = await client.rpc('learn_claim_job', { p_kind: 'item_extract', p_worker: worker } as never).abortSignal(signal);
    if (result.error) throw result.error;
    const job = (Array.isArray(result.data) ? result.data[0] : result.data) as Job | null;
    if (!job?.id) break;
    jobs.push(job);
  }
  // At most three concurrent jobs share the request deadline (maxDuration=60).
  return Promise.all(jobs.map(async job => {
    try {
      const provider = await createProvider('item_extract');
      const result = await processExtraction(job, client, provider, signal);
      const saved = await client.from('learn_jobs').update({ status: 'succeeded', result, locked_at: null, locked_by: null } as never).eq('id', job.id).eq('locked_by', worker);
      if (saved.error) throw saved.error;
      return { id: job.id, status: 'succeeded', ...result };
    } catch {
      const status = job.attempts < job.max_attempts ? 'queued' : 'failed';
      await client.from('learn_jobs').update({ status, error: 'Extraction failed or timed out. Check image format, provider configuration and migration; retry with Process now.', locked_at: null, locked_by: null } as never).eq('id', job.id).eq('locked_by', worker);
      return { id: job.id, status };
    }
  }));
}
