import { z } from 'zod';

export const ExtractedItem = z.object({
  stem_md: z.string().min(1).max(12000), answer_type: z.enum(['number', 'fraction', 'expression', 'choice', 'photo', 'text']),
  answer_guess: z.string().max(2000).nullable().optional(), needs_figure: z.boolean(),
  figure_bbox: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), width: z.number().positive().max(1), height: z.number().positive().max(1) }).strict().nullable().optional(),
  unit_hint: z.string().max(200).nullable().optional(),
}).strict().refine(item => !item.figure_bbox || (item.figure_bbox.x + item.figure_bbox.width <= 1 && item.figure_bbox.y + item.figure_bbox.height <= 1), 'Invalid image region');
export const Extraction = z.object({ items: z.array(ExtractedItem).min(1).max(30) }).strict();
export type ExtractedItemValue = z.infer<typeof ExtractedItem>;
export const ImageInput = z.object({ base64: z.string().min(1).max(22_000_000), mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']), signal: z.custom<AbortSignal>(value => value === undefined || value instanceof AbortSignal).optional() });
export const extractionJsonSchema = {
  type: 'object' as const, additionalProperties: false, required: ['items'], properties: {
    items: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['stem_md', 'answer_type', 'answer_guess', 'needs_figure', 'figure_bbox', 'unit_hint'],
      properties: {
        stem_md: { type: 'string' }, answer_type: { type: 'string', enum: ['number', 'fraction', 'expression', 'choice', 'photo', 'text'] },
        answer_guess: { type: ['string', 'null'] }, needs_figure: { type: 'boolean' }, unit_hint: { type: ['string', 'null'] },
        figure_bbox: { anyOf: [{ type: 'null' }, { type: 'object', additionalProperties: false, required: ['x', 'y', 'width', 'height'], properties: { x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' } } }] },
      },
    } },
  },
};
