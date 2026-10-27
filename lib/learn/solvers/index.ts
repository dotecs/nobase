import { mathcheck } from './mathcheck';
import type { AnswerSpecValue } from '../answer-spec';
import type { AnswerType } from '../types';
export type Grade = { result: 'correct' | 'incorrect' | 'input_issue' | 'pending_review'; normalized: string | string[] | null; detail: { reason?: string; not_reduced?: boolean } };
export type Solver = { grade(type: AnswerType, spec: AnswerSpecValue, input: unknown): Grade };
const registry: Record<string, Solver> = { mathcheck };
export function getSolver(name: string): Solver {
  if (!Object.hasOwn(registry, name)) throw new Error(`Unknown solver: ${name}`);
  return registry[name];
}
