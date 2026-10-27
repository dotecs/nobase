import { Enrichment, StoredEnrichment, EnrichmentSelection, type StoredEnrichmentValue } from './schema';
import { guessMatches, suggestAbilities, type Ability } from './authoring';
import { AnswerSpec } from '../answer-spec';
import { Rational } from '../mathcheck/rational';
import { parseMath } from '../mathcheck/parse';
import { polynomial } from '../mathcheck/evaluate';
import { solveItem } from '../mathcheck/solve';
import type { LlmProvider } from './provider';
import type { Database } from '@/lib/database.types';

type Item = Database['public']['Tables']['learn_items']['Row'];
export function verifyEnrichment(raw: unknown, item: Pick<Item, 'stem_md' | 'answer_type' | 'answer_spec'>, abilities: Ability[], provider: LlmProvider): StoredEnrichmentValue {
  const result = Enrichment.parse(raw), answer = AnswerSpec.parse(item.answer_spec);
  const misconceptions = result.misconceptions.flatMap(candidate => {
    // Numeric answers to relations may be written as a boundary only.
    let guess = candidate.wrong_value;
    if (answer.type === 'number' && answer.variable) {
      try { Rational.parse(guess); guess = `${answer.variable}${answer.relation}${guess}`; } catch { /* Full relation is checked below. */ }
    }
    if (guessMatches(guess, answer)) return [];
    let verified = false;
    try {
      if (answer.type === 'expression') { polynomial(parseMath(guess).left); verified = true; }
      else if (answer.type === 'number' && answer.variable) {
        const solved = solveItem(guess, 'number');
        verified = solved.ok && solved.answer_spec.type === 'number' && solved.answer_spec.variable === answer.variable;
      } else if (answer.type === 'number' || answer.type === 'fraction') { Rational.parse(guess); verified = true; }
    } catch { /* Unparseable guesses remain visible but cannot be applied. */ }
    return [{ ...candidate, verified }];
  });
  return StoredEnrichment.parse({ ...result, misconceptions, generated_at: new Date().toISOString(), provider: provider.name, model_id: provider.modelId, prompt_version: 'item_enrich.v1', is_mock: provider.isMock, applied_at: null,
    ability_candidates: { llm: [...new Set(result.ability_candidates)].filter(id => abilities.some(row => row.id === id)), rule: suggestAbilities({ stem_md: item.stem_md, answer_type: answer.type, needs_figure: false, injection_suspected: false }, abilities) },
  });
}
export function validateEnrichmentSelection(status: string, raw: unknown, selection: unknown) {
  if (status !== 'approved') throw new Error('승인된 초안만 보강할 수 있습니다');
  const enrichment = StoredEnrichment.parse(raw), selected = EnrichmentSelection.parse(selection);
  if (enrichment.applied_at !== null) throw new Error('이미 적용된 보강');
  if (new Set(selected.hints).size !== selected.hints.length || new Set(selected.misconceptions).size !== selected.misconceptions.length) throw new Error('중복 선택');
  if (selected.hints.some(i => !enrichment.hints[i]) || selected.misconceptions.some(i => !enrichment.misconceptions[i]?.verified)) throw new Error('미검증 오개념 또는 잘못된 선택');
  return { enrichment, selected };
}
