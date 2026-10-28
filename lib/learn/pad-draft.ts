import { z } from 'zod';

export const padDraftSchema=z.object({
  answer:z.union([z.string().max(4000),z.array(z.string().max(100)).max(100)]),
  steps:z.array(z.string().max(200)).max(12),
  photo_path:z.string().max(1000).nullable(),
  source:z.enum(['pad','screen']),
}).strict().refine(draft=>new TextEncoder().encode(JSON.stringify(draft)).byteLength<=8192,'입력 내용은 8KB 이내로 작성해 주세요.');
export const padAddressSchema=z.object({sessionId:z.uuid(),planIndex:z.number().int().nonnegative()});
export const savePadSchema=padAddressSchema.extend({draft:padDraftSchema});
export type PadDraft=z.infer<typeof padDraftSchema>;
export type SavedPadDraft={draft:PadDraft;updated_at:string};

export type PadSnapshot={draft:PadDraft|null;updated_at:string|null;plan_index:number;ended:boolean};
