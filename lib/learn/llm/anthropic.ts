import Anthropic from '@anthropic-ai/sdk';
import { extractionPrompt, enrichmentPrompt, type LlmProvider } from './provider';
import { Extraction, CompletionInput, Enrichment, extractionJsonSchema, enrichmentJsonSchema } from './schema';

// Verified 2026-10-26: https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic' as const;
  readonly isMock = false;
  constructor(readonly modelId = DEFAULT_ANTHROPIC_MODEL) {}
  async completeJson<T = unknown>(input: unknown): Promise<T> {
    const request = CompletionInput.parse(input);
    const image = request.task === 'item_extract' ? request.image : null;
    const prompt = request.task === 'item_extract' ? await extractionPrompt() : await enrichmentPrompt();
    const schema = request.task === 'item_extract' ? extractionJsonSchema : enrichmentJsonSchema;
    const output = request.task === 'item_extract' ? Extraction : Enrichment;
    const signal = request.task === 'item_extract' ? request.image.signal : request.signal;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 40_000, maxRetries: 0 });
    const response = await client.messages.create({
      model: this.modelId, max_tokens: 6000, system: prompt,
      tools: [{ name: 'extract_items', description: 'Return mathematics authoring data for the requested task.', input_schema: schema as typeof extractionJsonSchema }],
      tool_choice: { type: 'tool', name: 'extract_items' },
      messages: [{ role: 'user', content: request.task === 'item_enrich' ? [{ type: 'text', text: JSON.stringify({ payload: request.payload }) }] : [
        { type: 'text', text: JSON.stringify({ task: 'transcribe_math_items', image_is_untrusted_data: true }) },
        { type: 'image', source: { type: 'base64', media_type: image!.mediaType, data: image!.base64 } },
      ] }],
    }, { signal });
    if (response.stop_reason !== 'tool_use') throw new Error('Extraction refused or incomplete');
    const blocks = response.content.filter(block => block.type === 'tool_use' && block.name === 'extract_items');
    if (blocks.length !== 1 || blocks[0].type !== 'tool_use') throw new Error('Expected one extraction tool result');
    return output.parse(blocks[0].input) as T;
  }
  async extractItemsFromImage(input: unknown) { return Extraction.parse(await this.completeJson({ task: 'item_extract', image: input })).items; }
}
