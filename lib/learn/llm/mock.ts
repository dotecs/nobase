import type { LlmProvider } from './provider';
import { Extraction } from './schema';
export class MockProvider implements LlmProvider {
  readonly name = 'mock' as const;
  readonly modelId = 'mock-p21-v1';
  readonly isMock = true;
  async completeJson<T = unknown>(): Promise<T> {
    return Extraction.parse({ items: [{ stem_md: '$\\frac{1}{2}+\\frac{1}{3}$', answer_type: 'fraction', answer_guess: '5/6', needs_figure: false, figure_bbox: null, unit_hint: '04-3' }] }) as T;
  }
  async extractItemsFromImage() { return Extraction.parse(await this.completeJson()).items; }
}
