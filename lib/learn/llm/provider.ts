export type LlmProviderName = 'openai' | 'anthropic' | 'mock';

// 구체적인 요청·응답 스키마와 제공자 구현은 Phase 1에서 정의한다.
export interface LlmProvider {
  extractItemsFromImage(input: unknown): Promise<unknown>;
  completeJson<T = unknown>(input: unknown): Promise<T>;
}

// 타입 선언만 제공한다. Phase 0에서는 호출하거나 런타임 구현을 추가하지 않는다.
export declare function createProvider(name: LlmProviderName): LlmProvider;
