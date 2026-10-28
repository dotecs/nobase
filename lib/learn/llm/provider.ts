import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createAdminSupabaseClient } from '@/lib/supabase-admin';
import type { ExtractedItemValue } from './schema';
import type { Classifier } from './classifier';
export type LlmProviderName = 'openai' | 'anthropic' | 'mock';
export interface LlmProvider {
  name: LlmProviderName;
  modelId: string;
  isMock: boolean;
  classifier?: Classifier | null;
  extractItemsFromImage(input: unknown): Promise<ExtractedItemValue[]>;
  completeJson<T = unknown>(input: unknown): Promise<T>;
}
export const PROMPT_VERSION = 'item_extract.v2';
export async function extractionPrompt() { return readFile(resolve(process.cwd(), 'prompts/item_extract.v2.md'), 'utf8'); }
export async function enrichmentPrompt() { return readFile(resolve(process.cwd(), 'prompts/item_enrich.v1.md'), 'utf8'); }
export type LlmConfig = { default?: LlmProviderName; tasks?: Record<string, LlmProviderName>; models?: { openai?: string; anthropic?: string }; classifier?: {provider?:'typesafe';model?:string;auto_threshold?:number;enabled?:boolean} };
export function selectProvider(task: string, config: LlmConfig, keys: { openai?: string; anthropic?: string }): LlmProviderName {
  const requested = config.tasks?.[task] ?? config.default ?? 'openai';
  if (requested === 'mock') return 'mock';
  if (keys[requested]) return requested;
  const alternate = requested === 'openai' ? 'anthropic' : 'openai';
  return keys[alternate] ? alternate : 'mock';
}
export async function createProvider(task: string): Promise<LlmProvider> {
  const db = createAdminSupabaseClient();
  const result = await db.from('learn_rule_configs').select('config').eq('key', 'llm').lte('active_from', new Date().toISOString()).order('version', { ascending: false }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  const config = ((result.data as { config: LlmConfig } | null)?.config ?? {});
  const name = selectProvider(task, config, { openai: process.env.OPENAI_API_KEY, anthropic: process.env.ANTHROPIC_API_KEY });
  if (name === 'mock') { const { MockProvider } = await import('./mock'); return new MockProvider(); }
  if (name === 'openai') { const { OpenAIProvider } = await import('./openai'); return new OpenAIProvider(config.models?.openai); }
  const { AnthropicProvider } = await import('./anthropic'); return new AnthropicProvider(config.models?.anthropic);
}
