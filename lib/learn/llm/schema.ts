import { z } from 'zod';
import { AnswerSpec } from '../answer-spec';

const Hint = z.object({ level: z.union([z.literal(1), z.literal(2)]), text_md: z.string().min(1).max(4000) }).strict();
const Misconception = z.object({ pattern: z.string().min(1).max(2000), wrong_value: z.string().min(1).max(2000), explanation: z.string().min(1).max(4000) }).strict();
const ReasonItem = z.object({ stem_md: z.string().min(1).max(12000), model_answer_md: z.string().min(1).max(12000), rubric: z.array(z.object({ criterion: z.string().min(1).max(2000), points: z.number().int().positive() }).strict()).min(2).max(4) }).strict();
export const Enrichment = z.object({
  hints: z.array(Hint).length(2).refine(rows => new Set(rows.map(row => row.level)).size === 2),
  misconceptions: z.array(Misconception).min(1).max(3), reason_item: ReasonItem,
  ability_candidates: z.array(z.string()).max(2),
}).strict();
export const EnrichmentPayload = z.object({ item: z.object({ stem_md: z.string(), answer_type: z.string(), answer_spec: AnswerSpec }).strict(), abilities: z.array(z.object({ id: z.string(), name: z.string(), action: z.string() }).strict()) }).strict();
export const StoredEnrichment = z.object({
  generated_at: z.string(), provider: z.string(), model_id: z.string(), prompt_version: z.literal('item_enrich.v1'), is_mock: z.boolean(),
  hints: Enrichment.shape.hints, misconceptions: z.array(Misconception.extend({ verified: z.boolean() })), reason_item: ReasonItem,
  ability_candidates: z.object({ llm: z.array(z.string()), rule: z.array(z.string()) }), applied_at: z.string().nullable(),
});
export type StoredEnrichmentValue = z.infer<typeof StoredEnrichment>;
export const EnrichmentSelection = z.object({ hints: z.array(z.number().int().min(0).max(1)).max(2), misconceptions: z.array(z.number().int().min(0).max(2)).max(3), reason_item: z.boolean() }).strict().refine(value => value.hints.length + value.misconceptions.length > 0 || value.reason_item, '선택 없음');
export const enrichmentJsonSchema = z.toJSONSchema(Enrichment);

export const ExtractedItem = z.object({
  stem_md: z.string().min(1).max(12000), answer_type: z.enum(['number', 'fraction', 'expression', 'choice', 'photo', 'text']),
  answer_guess: z.string().max(2000).nullable().optional(), needs_figure: z.boolean(), needs_coach: z.boolean().optional(), injection_suspected: z.boolean(),
  figure_bbox: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).strict().nullable().optional(),
  unit_hint: z.string().max(200).nullable().optional(),
}).strict().refine(item => !item.figure_bbox || (item.figure_bbox.x + item.figure_bbox.width <= 1 && item.figure_bbox.y + item.figure_bbox.height <= 1), 'Invalid image region');
export const Extraction = z.object({ items: z.array(ExtractedItem).min(1).max(30) }).strict();
export type ExtractedItemValue = z.infer<typeof ExtractedItem>;
export const ImageInput = z.object({ base64: z.string().min(1).max(22_000_000), mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']), signal: z.custom<AbortSignal>(value => value === undefined || value instanceof AbortSignal).optional() });
export const CompletionInput = z.discriminatedUnion('task', [
  z.object({ task: z.literal('item_extract'), image: ImageInput }),
  z.object({ task: z.literal('item_enrich'), payload: EnrichmentPayload, signal: ImageInput.shape.signal }),
]);
export const extractionJsonSchema = {
  type: 'object' as const, additionalProperties: false, required: ['items'], properties: {
    items: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['stem_md', 'answer_type', 'answer_guess', 'needs_figure', 'needs_coach', 'injection_suspected', 'figure_bbox', 'unit_hint'],
      properties: {
        stem_md: { type: 'string' }, answer_type: { type: 'string', enum: ['number', 'fraction', 'expression', 'choice', 'photo', 'text'] },
        answer_guess: { type: ['string', 'null'] }, needs_figure: { type: 'boolean' }, needs_coach: { type: 'boolean' }, injection_suspected: { type: 'boolean' }, unit_hint: { type: ['string', 'null'] },
        figure_bbox: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['x', 'y', 'width', 'height'], properties: { x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' } } }] },
      },
    } },
  },
};
