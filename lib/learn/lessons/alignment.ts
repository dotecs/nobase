import {z} from 'zod';
export const alignmentSchema=z.object({chars:z.string(),start:z.array(z.number().finite().nonnegative()),end:z.array(z.number().finite().nonnegative())}).refine(a=>Array.from(a.chars).length===a.start.length&&a.start.length===a.end.length&&a.start.every((t,i)=>t<=a.end[i]&&(i===0||t>=a.start[i-1])),'정렬 길이 또는 시각 오류');
export type Alignment=z.infer<typeof alignmentSchema>;
export function parseAlignment(value:unknown):Alignment|null{const result=alignmentSchema.safeParse(value);return result.success?result.data:null;}
export const speechResponseSchema=z.object({audio_base64:z.string().min(1).max(28000000).regex(/^[A-Za-z0-9+/]+={0,2}$/),alignment:z.object({characters:z.array(z.string().min(1)),character_start_times_seconds:z.array(z.number()),character_end_times_seconds:z.array(z.number())})});
export function compactAlignment(a:z.infer<typeof speechResponseSchema>['alignment']){const value=alignmentSchema.parse({chars:a.characters.join(''),start:a.character_start_times_seconds.map(t=>Math.round(t*1000)),end:a.character_end_times_seconds.map(t=>Math.round(t*1000))});if(!value.end.length||value.end.at(-1)!<=0)throw new Error('빈 음성 정렬');return value;}
