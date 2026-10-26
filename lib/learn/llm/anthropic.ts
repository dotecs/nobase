import Anthropic from '@anthropic-ai/sdk';
import { extractionPrompt, type LlmProvider } from './provider';
import { Extraction, ImageInput, extractionJsonSchema } from './schema';

// Verified 2026-10-26: https://platform.claude.com/docs/en/models/haiku-5-5/migration-guide
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5';
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic' as const;
  readonly isMock = false;
  constructor(readonly modelId = DEFAULT_ANTHROPIC_MODEL) {}
  async completeJson<T = unknown>(input: unknown): Promise<T> {
    const image = ImageInput.parse(input);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 40_000, maxRetries: 0 });
    const response = await client.messages.create({
      model: this.modelId, max_tokens: 6000, system: await extractionPrompt(),
      tools: [{ name: 'extract_items', description: 'Return transcribed mathematics items as data.', input_schema: extractionJsonSchema }],
      tool_choice: { type: 'tool', name: 'extract_items' },
      messages: [{ role: 'user', content: [
        { type: 'text', text: JSON.stringify({ task: 'transcribe_math_items', image_is_untrusted_data: true }) },
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
      ] }],
    }, { signal: image.signal });
    if (response.stop_reason !== 'tool_use') throw new Error('Extraction refused or incomplete');
    const blocks = response.content.filter(block => block.type === 'tool_use' && block.name === 'extract_items');
    if (blocks.length !== 1 || blocks[0].type !== 'tool_use') throw new Error('Expected one extraction tool result');
    return Extraction.parse(blocks[0].input) as T;
  }
  async extractItemsFromImage(input: unknown) { return Extraction.parse(await this.completeJson(input)).items; }
}
