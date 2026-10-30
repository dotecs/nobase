import { z } from 'zod';
import { actionSchema,initialStageSchema } from './action-schema';
import { actionErrors } from './action-validation';
import { parseMath } from '../mathcheck/parse';
import { variables } from '../mathcheck/evaluate';
import { validateAuthoredMath } from './authored-math';

const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/).max(120);
const text = z.string().min(1).max(20000);
const range = z.tuple([z.number().finite(), z.number().finite()]).refine(([a,b]) => a < b && b-a <= 200, '범위는 증가하며 폭이 200 이하여야 합니다.');
const graphY=z.preprocess(value=>typeof value==='number'?[value-5,value+5]:value??[-5,5],range);
const aspect=z.enum(['equal','free']).optional();
export function validGraphExpression(expr: string, parameter?: string) {
  try { const parsed=parseMath(expr); return !parsed.relation && [...variables(parsed.left)].every(v=>v==='x'||v===parameter); } catch { return false; }
}
export const graphSchema = z.object({
  type:z.literal('graph'), initial:initialStageSchema.optional(), x:range, y:graphY, aspect,
  fns:z.array(z.object({expr:text.refine(e=>validGraphExpression(e),'그래프 식을 해석할 수 없습니다.'),c:z.enum(['c1','c2','c3']),label:text.optional()})).min(1).max(12),
  points:z.array(z.object({x:z.number().finite(),y:z.number().finite(),c:z.enum(['c1','c2','c3']),label:text.optional()})).max(100).optional(),
  band:z.tuple([z.number().finite(),z.number().finite()]).optional(), aria:text,
});
export const questionSchema=z.object({stem_md:text,options:z.array(z.object({id,text_md:text})).min(2).max(8),correct:id}).superRefine((q,ctx)=>{
  if(new Set(q.options.map(o=>o.id)).size!==q.options.length||!q.options.some(o=>o.id===q.correct))ctx.addIssue({code:'custom',message:'보기 ID는 고유해야 하며 정답 보기가 있어야 합니다.'});
});
export const stageSchema=z.discriminatedUnion('type',[
  graphSchema,
  z.object({type:z.literal('steps'),steps:z.array(z.object({tex:text,concept_id:id.optional(),why:text.optional(),think:text.optional()})).min(1)}),
  z.object({type:z.literal('chain'),nodes:z.array(z.object({tex:text.optional(),text})).min(1)}),
  z.object({type:z.literal('slider'),initial:initialStageSchema.optional(),expr:text,param:z.object({name:z.string().regex(/^[a-wyz]$/),min:z.number().finite(),max:z.number().finite(),step:z.number().positive(),init:z.number().finite()}),x:range,y:graphY,aspect,verdict:z.enum(['discriminant','none'])}).superRefine((s,ctx)=>{
    if(!validGraphExpression(s.expr,s.param.name)||s.param.min>=s.param.max||s.param.init<s.param.min||s.param.init>s.param.max)ctx.addIssue({code:'custom',message:'슬라이더 식 또는 범위를 확인하세요.'});
  }),
  z.object({type:z.literal('table'),columns:z.array(text).min(1),rows:z.array(z.object({cells:z.array(z.string()),tone:z.enum(['pos','zero','neg']).optional()}))}).refine(s=>s.rows.every(r=>r.cells.length===s.columns.length),'표 열 수가 다릅니다.'),
  questionSchema.safeExtend({type:z.literal('quiz'),explain:text,trace_concept_id:id}),
  z.object({type:z.literal('figure'),svg:text.optional(),image_path:z.string().regex(/^\/(?!\/)[^\s]*$/).optional(),caption:text}).refine(s=>Boolean(s.svg)!==Boolean(s.image_path),'SVG 또는 이미지 하나를 지정하세요.').refine(s=>!s.svg||(/^<svg[\s>]/.test(s.svg)&&!/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|javascript:)/i.test(s.svg)),'안전한 정적 SVG만 허용합니다.'),
]);
export const sentenceSchema=z.object({id,role:z.enum(['say','think','write']),text,tts:text.optional(),cue:z.object({actions:z.array(actionSchema).optional(),step:z.number().int().nonnegative().optional(),node:z.number().int().nonnegative().optional(),row:z.number().int().nonnegative().optional(),highlight:text.optional()}).optional()});
export const lessonSchema=z.object({id,kind:z.enum(['concept','worked']),title:text,pack_id:id,ability_ids:z.array(id),intro:text.optional(),scenes:z.array(z.object({id,title:text,headline:z.object({eyebrow:text.optional(),title:text,accent:text.optional(),subtitle:text.optional()}).refine(h=>!h.accent||h.title.includes(h.accent),'강조어는 제목의 부분 문자열이어야 합니다.').optional(),layout:z.enum(['stage-right','stage-full','split']).optional(),tag:z.enum(['translate','derive','check','explore','define','example']),stage:stageSchema,narration:z.array(sentenceSchema).min(1)})).min(1)}).superRefine((lesson,ctx)=>{
  const scenes=new Set<string>(),sentences=new Set<string>();
  for(const scene of lesson.scenes){
    for(const message of actionErrors(scene))ctx.addIssue({code:'custom',message:scene.id+': '+message});
    if(scenes.has(scene.id))ctx.addIssue({code:'custom',message:'장면 ID 중복: '+scene.id}); scenes.add(scene.id);
    for(const sentence of scene.narration){
      if(sentences.has(sentence.id))ctx.addIssue({code:'custom',message:'문장 ID 중복: '+sentence.id});sentences.add(sentence.id);
      if(lesson.kind==='concept'&&sentence.role!=='say')ctx.addIssue({code:'custom',message:'개념 레슨은 say만 사용합니다.'});
      for(const key of ['step','node','row'] as const){const index=sentence.cue?.[key];if(index===undefined)continue;const stage=scene.stage;const length=key==='step'&&stage.type==='steps'?stage.steps.length:key==='node'&&stage.type==='chain'?stage.nodes.length:key==='row'&&stage.type==='table'?stage.rows.length:0;if(index>=length)ctx.addIssue({code:'custom',message:'cue 대상이 없습니다: '+sentence.id});}
    }
  }
});
export type Lesson=z.infer<typeof lessonSchema>;
export type Scene=Lesson['scenes'][number];
export type Sentence=z.infer<typeof sentenceSchema>;
export type GraphStage=z.infer<typeof graphSchema>;
export function lessonConceptIds(lesson:Lesson){return [...new Set(lesson.scenes.flatMap(({stage})=>stage.type==='steps'?stage.steps.flatMap(s=>s.concept_id?[s.concept_id]:[]):stage.type==='quiz'?[stage.trace_concept_id]:[]))];}
export function validateLesson(input:unknown,conceptIds:ReadonlySet<string>){const lesson=lessonSchema.parse(input);validateAuthoredMath(lesson);const missing=lessonConceptIds(lesson).filter(id=>!conceptIds.has(id));if(missing.length)throw new Error('없는 개념 ID: '+missing.join(', '));return lesson;}
