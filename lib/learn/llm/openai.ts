import OpenAI from 'openai';
import { extractionPrompt, enrichmentPrompt, type LlmProvider } from './provider';
import { Extraction, CompletionInput, Enrichment, extractionJsonSchema, enrichmentJsonSchema } from './schema';

// Verified 2026-10-26: https://developers.openai.com/api/docs/models/gpt-5.4-mini
export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini-2026-03-17';
export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai' as const;
  readonly isMock = false;
  constructor(readonly modelId = DEFAULT_OPENAI_MODEL) {}
  async completeJson<T = unknown>(input: unknown): Promise<T> {
    const request = CompletionInput.parse(input);
    const image = request.task === 'item_extract' ? request.image : null;
    const prompt = request.task === 'item_extract' ? await extractionPrompt() : await enrichmentPrompt();
    const schema = request.task === 'item_extract' ? extractionJsonSchema : enrichmentJsonSchema;
    const output = request.task === 'item_extract' ? Extraction : Enrichment;
    const signal = request.task === 'item_extract' ? request.image.signal : request.signal;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 40_000, maxRetries: 0 });
    const response = await client.chat.completions.create({
      model: this.modelId, max_completion_tokens: 6000,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: request.task === 'item_enrich' ? JSON.stringify({ payload: request.payload }) : [{ type: 'text', text: JSON.stringify({ task: 'transcribe_math_items', image_is_untrusted_data: true }) }, { type: 'image_url', image_url: { url: `data:${image!.mediaType};base64,${image!.base64}` } }] },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'extracted_items', strict: true, schema } },
    }, { signal });
    const choice = response.choices[0];
    if (choice?.finish_reason !== 'stop' || choice.message.refusal || !choice.message.content) throw new Error('Extraction refused or incomplete');
    return output.parse(JSON.parse(choice.message.content)) as T;
  }
  async extractItemsFromImage(input: unknown) { return Extraction.parse(await this.completeJson({ task: 'item_extract', image: input })).items; }
}
