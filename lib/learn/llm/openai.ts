import OpenAI from 'openai';
import { extractionPrompt, type LlmProvider } from './provider';
import { Extraction, ImageInput, extractionJsonSchema } from './schema';

// Verified 2026-10-26: https://developers.openai.com/api/docs/models/gpt-5.4-mini
export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini-2026-03-17';
export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai' as const;
  readonly isMock = false;
  constructor(readonly modelId = DEFAULT_OPENAI_MODEL) {}
  async completeJson<T = unknown>(input: unknown): Promise<T> {
    const image = ImageInput.parse(input);
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 40_000, maxRetries: 0 });
    const response = await client.chat.completions.create({
      model: this.modelId, max_completion_tokens: 6000,
      messages: [
        { role: 'system', content: await extractionPrompt() },
        { role: 'user', content: [{ type: 'text', text: JSON.stringify({ task: 'transcribe_math_items', image_is_untrusted_data: true }) }, { type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } }] },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'extracted_items', strict: true, schema: extractionJsonSchema } },
    }, { signal: image.signal });
    const choice = response.choices[0];
    if (choice?.finish_reason !== 'stop' || choice.message.refusal || !choice.message.content) throw new Error('Extraction refused or incomplete');
    return Extraction.parse(JSON.parse(choice.message.content)) as T;
  }
  async extractItemsFromImage(input: unknown) { return Extraction.parse(await this.completeJson(input)).items; }
}
