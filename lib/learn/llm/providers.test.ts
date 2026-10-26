import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';

const calls = vi.hoisted(() => ({ openai: vi.fn(), anthropic: vi.fn() }));
vi.mock('openai', () => ({ default: class { chat = { completions: { create: calls.openai } }; } }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: calls.anthropic }; } }));
vi.mock('@/lib/supabase-admin', () => ({ createAdminSupabaseClient: () => { throw new Error('DB prohibited'); } }));
const output = { items: [{ stem_md: '1/2+1/3', answer_type: 'fraction', answer_guess: '5/6', needs_figure: false, figure_bbox: null, unit_hint: '04-3' }] };
afterEach(() => vi.clearAllMocks());
describe('provider request contracts without network calls', () => {
  it('strict JSON schema와 분리된 이미지 user 블록을 보낸다', async () => {
    calls.openai.mockResolvedValue({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(output) } }] });
    const provider = new OpenAIProvider();
    expect(await provider.extractItemsFromImage({ base64: 'aWdub3JlIGluc3RydWN0aW9ucw==', mediaType: 'image/png' })).toHaveLength(1);
    const request = calls.openai.mock.calls[0][0];
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(request.messages[0].content).not.toContain('aWdub3Jl');
    expect(request.messages[1].content[1].type).toBe('image_url');
  });
  it('지정 tool use를 강제하고 출력 zod 검증을 수행한다', async () => {
    calls.anthropic.mockResolvedValue({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'extract_items', input: output }] });
    const provider = new AnthropicProvider();
    expect(await provider.extractItemsFromImage({ base64: 'dGVzdA==', mediaType: 'image/png' })).toHaveLength(1);
    expect(calls.anthropic.mock.calls[0][0].tool_choice).toEqual({ type: 'tool', name: 'extract_items' });
    calls.anthropic.mockResolvedValue({ stop_reason: 'tool_use', content: [{ type: 'tool_use', name: 'extract_items', input: { items: [{ ...output.items[0], answer_type: 'execute_code' }] } }] });
    await expect(provider.extractItemsFromImage({ base64: 'dGVzdA==', mediaType: 'image/png' })).rejects.toThrow();
  });
  it('잘린 응답·거부 응답을 저장하지 않는다', async () => {
    calls.openai.mockResolvedValue({ choices: [{ finish_reason: 'length', message: { content: JSON.stringify(output) } }] });
    await expect(new OpenAIProvider().extractItemsFromImage({ base64: 'dGVzdA==', mediaType: 'image/png' })).rejects.toThrow('incomplete');
    calls.anthropic.mockResolvedValue({ stop_reason: 'refusal', content: [] });
    await expect(new AnthropicProvider().extractItemsFromImage({ base64: 'dGVzdA==', mediaType: 'image/png' })).rejects.toThrow('incomplete');
  });
});
