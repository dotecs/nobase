import { createHash } from 'node:crypto';
import { z } from 'zod';
import { AnswerSpec, type AnswerSpecValue } from '../answer-spec';
import { ItemsFile } from '../pack-schema';
import { normalizeStem, solveItem } from '../mathcheck/solve';
import { Rational } from '../mathcheck/rational';
import { parseMath } from '../mathcheck/parse';
import { equivalent } from '../mathcheck/evaluate';
import { Extraction, type ExtractedItemValue } from './schema';
import type { LlmProvider } from './provider';
import type { Database, Json } from '@/lib/database.types';

export type Draft = Database['public']['Tables']['learn_item_drafts']['Row'];
export type Source = Database['public']['Tables']['learn_item_sources']['Row'];
export type Ability = { id: string; name: string };
export function suggestAbilities(item: ExtractedItemValue, abilities: Ability[]) {
  const hint = item.unit_hint ?? '';
  const exact = abilities.filter(row => row.id === hint || (hint.length > 1 && row.name.includes(hint))).map(row => row.id);
  const text = item.stem_md;
  const rule = /[<>≤≥]|\\(?:le|ge)/.test(text) ? ['06-3', '06-2'] : /=/.test(text) ? ['05-3', '05-4'] : /\\frac|\//.test(text) ? ['04-3', '04-5'] : /[a-z]/.test(text.replace(/\\[a-z]+/g, '')) ? ['03-1', '02-4'] : ['01-4', '01-3'];
  return [...new Set([...exact, ...rule])].filter(id => abilities.some(row => row.id === id)).slice(0, 2);
}
export function guessMatches(guess: string, answer: AnswerSpecValue) {
  try {
    guess = normalizeStem(guess);
    if (answer.type === 'expression') return equivalent(parseMath(guess).left, parseMath(answer.value).left);
    if (answer.type !== 'number' && answer.type !== 'fraction') return false;
    if (answer.type === 'number' && answer.variable) {
      try { Rational.parse(guess); guess = `${answer.variable}${answer.relation}${guess}`; } catch { /* Full relations are compared as supplied. */ }
      const result = solveItem(guess, 'number');
      return result.ok && result.answer_spec.type === 'number' && result.answer_spec.variable === answer.variable && result.answer_spec.relation === answer.relation && Rational.parse(result.answer_spec.value).compare(Rational.parse(answer.value)) === 0;
    }
    return Rational.parse(guess).compare(Rational.parse(answer.value)) === 0;
  } catch { return false; }
}
export async function extractDrafts(sourceId: string, image: unknown, provider: LlmProvider, abilities: Ability[]) {
  const { items } = Extraction.parse({ items: await provider.extractItemsFromImage(image) });
  return items.map((item, index) => {
    if (item.injection_suspected) item.answer_guess = null;
    const solved = item.needs_figure || item.injection_suspected ? { ok: false as const, reason: 'unsupported' } : solveItem(item.stem_md, item.answer_type);
    const candidates = suggestAbilities(item, abilities);
    const hash = createHash('sha256').update(`${sourceId}/${index}`).digest('hex');
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
    return {
      id, source_id: sourceId, crop: item.figure_bbox ?? null,
      extract: { original: item, warning: item.injection_suspected ? 'injection_suspected' : solved.ok && item.answer_guess && !guessMatches(item.answer_guess, solved.answer_spec) ? 'llm_mismatch' : null } as Json,
      stem_md: item.stem_md, answer_type: item.answer_type, answer_spec: solved.ok ? solved.answer_spec as Json : null,
      answer_verified_by: solved.ok ? 'program' : null, ability_candidates: candidates, ability_id: candidates[0] ?? null,
      usage_suggested: 'assessment', status: solved.ok ? 'extracted' : 'needs_coach',
      provider: provider.name, model_id: provider.modelId, prompt_version: 'item_extract.v2', is_mock: provider.isMock,
    } satisfies Database['public']['Tables']['learn_item_drafts']['Insert'];
  });
}
export const ApprovalInput = z.object({
  draftId: z.uuid(), stem_md: z.string().min(1).max(12000), answer_type: z.enum(['number', 'fraction', 'expression', 'choice', 'photo', 'text']),
  ability_id: z.string().regex(/^\d{2}-\d+$/), usage: z.enum(['diagnostic', 'practice', 'assessment', 'review']),
  coachConfirmed: z.boolean(), coachAnswer: z.unknown().optional(), saveImage: z.boolean(),
});
export type ApprovalValue = z.infer<typeof ApprovalInput>;
export function prepareApproval(input: unknown, source: Pick<Source, 'origin' | 'storage_path'>, needsFigure = false) {
  const value = ApprovalInput.parse(input);
  if (source.origin === 'reference_only') throw new Error('참고용 이미지는 승인할 수 없습니다.');
  const solved = needsFigure ? { ok: false as const } : solveItem(value.stem_md, value.answer_type);
  let answer: AnswerSpecValue;
  let verified: 'program' | 'coach';
  if (value.coachConfirmed) {
    answer = AnswerSpec.parse(value.coachAnswer); verified = 'coach';
    if (answer.type !== value.answer_type) throw new Error('정답 형식이 문항과 다릅니다.');
  } else if (solved.ok) { answer = solved.answer_spec; verified = 'program'; }
  else throw new Error('프로그램 검증 실패 — 코치가 정답을 입력하고 확인해야 합니다.');
  const item = ItemsFile.parse([{ id: 'pending', version: 1, ability_id: value.ability_id, usage: value.usage, stem_md: value.stem_md, answer_type: value.answer_type, answer_spec: answer, status: 'reviewed', source_draft_id: value.draftId }])[0];
  return { value, item, verified, saveImage: value.saveImage || value.answer_type === 'photo' };
}
