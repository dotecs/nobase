import { z } from 'zod';
export const audioDurationSchema=z.object({sentenceId:z.string().min(1).max(200),durationMs:z.number().int().min(1).max(2147483647)});
