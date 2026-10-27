import 'next/headers';
import { AnswerSpec } from './answer-spec';
import { getSolver } from './solvers';
import type { LearnItem } from './items';
import type { AttemptResult } from './types';
import { traced, type RuleContext } from './rules/types';
export function gradeAttempt(item: Pick<LearnItem, 'answer_type' | 'answer_spec'>, input: unknown, hintsUsed: number, solverName: string, config: RuleContext<'solvers'>) {
  if (!Number.isInteger(hintsUsed) || hintsUsed < 0) throw new Error('Invalid hint count');
  const graded = getSolver(solverName).grade(item.answer_type, AnswerSpec.parse(item.answer_spec), input);
  const result: AttemptResult = graded.result === 'correct' ? hintsUsed > 0 || graded.detail.not_reduced ? 'correct_assisted' : 'correct_independent' : graded.result;
  const trace = traced(result, config, ['solvers'], 'grade_attempt', [graded.result, result], { solver: solverName, hints_used: hintsUsed }).trace;
  return { result, auto_grade: { solver: solverName, ...graded, trace }, rule_version: trace.rule_version };
}
