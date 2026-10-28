import 'next/headers';
import { z } from 'zod';
export const ClassifierConfig = z.object({
  provider: z.literal('typesafe').default('typesafe'), model: z.string().min(1).default('jev-latest'),
  auto_threshold: z.number().min(0).max(1).default(0.9), enabled: z.boolean().default(false),
});
const Input = z.object({ stem_md: z.string().min(1), abilities: z.array(z.object({ id:z.string().min(1),name:z.string(),action:z.string() })).min(1) });
const Response = z.object({ answers:z.object({ability:z.object({choice:z.string(),confidence:z.number().min(0).max(1),probabilities:z.record(z.string(),z.number().min(0).max(1))})}),usage:z.object({input_tokens:z.number().int().nonnegative()}),model:z.string().min(1) });
export type ClassifierInput = z.infer<typeof Input>;
export type ClassifierResult = {choice:string;confidence:number;probabilities:Record<string,number>;top2:{id:string;p:number}[];model:string;input_tokens:number;latency_ms:number};
export type Classifier = {auto_threshold:number; classify:(input:ClassifierInput)=>Promise<ClassifierResult>};
export async function classifyAbility(input:ClassifierInput,model:string,key:string):Promise<ClassifierResult>{
  const value=Input.parse(input),criteria=Object.fromEntries(value.abilities.map(row=>[row.id,`${row.name} — ${row.action}`]));
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000),started=performance.now();
  try {
    const response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({model,state:{problem_stem_markdown:value.stem_md},questions:{ability:{type:'choice',instructions:'이 한국어 중학 수학 문제를 푸는 데 필요한 핵심 소주제 하나를 고르시오. 문제의 수식($...$는 LaTeX)이 요구하는 연산·개념을 기준으로 판단하시오.',criteria}}})});
    if(!response.ok)throw new Error(`TypeSafe HTTP ${response.status}`);
    const parsed=Response.parse(await response.json()),answer=parsed.answers.ability;
    if(!Object.hasOwn(criteria,answer.choice)||!Object.hasOwn(answer.probabilities,answer.choice)||Object.keys(answer.probabilities).some(id=>!Object.hasOwn(criteria,id)))throw new Error('Invalid classifier ability');
    return {...answer,top2:Object.entries(answer.probabilities).sort(([a,p],[b,q])=>q-p||a.localeCompare(b)).slice(0,2).map(([id,p])=>({id,p})),model:parsed.model,input_tokens:parsed.usage.input_tokens,latency_ms:Math.round(performance.now()-started)};
  } finally {clearTimeout(timer);}
}
export function configuredClassifier(config:unknown,key=process.env.TYPESAFE_API_KEY):Classifier|null {
  if(!key)return null;
  const settings=ClassifierConfig.parse(config??{});if(!settings.enabled)return null;
  return {auto_threshold:settings.auto_threshold,classify:input=>classifyAbility(input,settings.model,key)};
}
