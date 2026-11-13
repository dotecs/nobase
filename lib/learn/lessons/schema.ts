import {itemsSchema,itemErrors} from './items';
import {treeSchema} from './tree';
import {coordinate,graphPoint} from './coordinate';
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
  type:z.literal('graph'), items:itemsSchema.optional(), initial:initialStageSchema.optional(), x:range, y:graphY, aspect, number_line:z.boolean().optional(),
  fns:z.array(z.object({expr:text.refine(e=>validGraphExpression(e),'그래프 식을 해석할 수 없습니다.'),c:z.enum(['c1','c2','c3']),label:text.optional()})).max(12),
  points:z.array(graphPoint).max(100).optional(),
  band:z.tuple([z.number().finite(),z.number().finite()]).optional(), aria:text,
}).refine(s=>s.number_line||s.fns.length>0,'그래프에는 함수가 하나 이상 필요합니다.');
export const questionSchema=z.object({stem_md:text,options:z.array(z.object({id,text_md:text})).min(2).max(8),correct:id}).superRefine((q,ctx)=>{
  if(new Set(q.options.map(o=>o.id)).size!==q.options.length||!q.options.some(o=>o.id===q.correct))ctx.addIssue({code:'custom',message:'보기 ID는 고유해야 하며 정답 보기가 있어야 합니다.'});
});
export const stageSchema=z.discriminatedUnion('type',[
  graphSchema,
  treeSchema,
  z.object({type:z.literal('board'),items:itemsSchema,initial:initialStageSchema.optional(),aspect:z.literal('16:9').optional()}),
  z.object({type:z.literal('steps'),/** 문제 문장. 있으면 풀이 줄 위에 장면 내내 고정된다(시험지 지면). `[[이름|구절]]`은 지시 대상 `problem/이름`. */problem:text.optional(),items:itemsSchema.optional(),initial:initialStageSchema.optional(),steps:z.array(z.object({tex:text,concept_id:id.optional(),why:text.optional(),think:text.optional()})).min(1)}),
  z.object({type:z.literal('chain'),items:itemsSchema.optional(),initial:initialStageSchema.optional(),nodes:z.array(z.object({tex:text.optional(),text})).min(1)}),
  z.object({type:z.literal('slider'),items:itemsSchema.optional(),initial:initialStageSchema.optional(),expr:text,points:z.array(graphPoint).max(100).optional(),param:z.object({name:z.string().regex(/^[a-wyz]$/),min:coordinate,max:coordinate,step:coordinate.pipe(z.number().positive()),control:z.enum(['stepper','slider']).optional(),init:coordinate}),x:range,y:graphY,aspect,number_line:z.boolean().optional(),verdict:z.enum(['discriminant','none'])}).superRefine((s,ctx)=>{
    if(!validGraphExpression(s.expr,s.param.name)||s.param.min>=s.param.max||s.param.init<s.param.min||s.param.init>s.param.max)ctx.addIssue({code:'custom',message:'슬라이더 식 또는 범위를 확인하세요.'});
  }),
  z.object({type:z.literal('table'),items:itemsSchema.optional(),initial:initialStageSchema.optional(),columns:z.array(text).min(1),rows:z.array(z.object({cells:z.array(z.string()),tone:z.enum(['pos','zero','neg']).optional()}))}).refine(s=>s.rows.every(r=>r.cells.length===s.columns.length),'표 열 수가 다릅니다.'),
  questionSchema.safeExtend({type:z.literal('quiz'),explain:text,trace_concept_id:id,graph:graphSchema.optional()}),
  z.object({type:z.literal('figure'),items:itemsSchema.optional(),initial:initialStageSchema.optional(),svg:text.optional(),image_path:z.string().regex(/^\/(?!\/)[^\s]*$/).optional(),caption:text}).refine(s=>Boolean(s.svg)!==Boolean(s.image_path),'SVG 또는 이미지 하나를 지정하세요.').refine(s=>!s.svg||(/^<svg[\s>]/.test(s.svg)&&!/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|javascript:)/i.test(s.svg)),'안전한 정적 SVG만 허용합니다.'),
]).superRefine((stage,ctx)=>{for(const message of itemErrors(stage))ctx.addIssue({code:'custom',message});});
export const sentenceSchema=z.object({id,role:z.enum(['say','think','write']),text,tts:text.optional(),cue:z.object({actions:z.array(actionSchema).optional(),step:z.number().int().nonnegative().optional(),node:z.number().int().nonnegative().optional(),row:z.number().int().nonnegative().optional(),highlight:text.optional()}).optional()});
export const lessonSchema=z.object({id,kind:z.enum(['concept','worked']),title:text,pack_id:id,ability_ids:z.array(id),intro:text.optional(),goal:z.string().max(120).optional(),scenes:z.array(z.object({id,title:text,headline:z.object({accent_bar:z.boolean().optional(),eyebrow:text.optional(),title:text,accent:text.optional(),subtitle:text.optional(),formula:z.string().max(300).optional()}).refine(h=>!h.accent||h.title.includes(h.accent),'강조어는 제목의 부분 문자열이어야 합니다.').optional(),layout:z.enum(['stage-right','stage-full','split']).optional(),tag:z.enum(['translate','derive','check','explore','define','example']),stage:stageSchema,narration:z.array(sentenceSchema).min(1)})).min(1)}).superRefine((lesson,ctx)=>{
  const scenes=new Set<string>(),sentences=new Set<string>();
  for(const scene of lesson.scenes){
    for(const match of (scene.headline?.formula??'').matchAll(/\{\{([^}]+)\}\}/g)){if(scene.stage.type!=='slider'||match[1]!==scene.stage.param.name)ctx.addIssue({code:'custom',message:'없는 수식 파라미터: '+match[1]});}
    // 강 번호 참조({{강:…}})는 화면 전용이다. 음성은 미리 녹음되므로 대본에서는 단원명만 말한다(lesson-refs.ts).
    for(const sentence of scene.narration)if(/\{\{강:/.test(sentence.text+(sentence.tts??'')))ctx.addIssue({code:'custom',message:scene.id+'/'+sentence.id+': 음성 대본에는 강 번호 참조를 쓸 수 없습니다. 단원명만 말하세요.'});
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
