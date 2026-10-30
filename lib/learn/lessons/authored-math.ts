import katex from 'katex';
import type { Lesson } from './schema';
/** Authored TeX has a wider vocabulary than student answers (e.g. ± and primes). */
export function validateAuthoredMath(lesson:Lesson){
 const check=(tex:string)=>{try{katex.renderToString(tex,{throwOnError:true,trust:false,strict:false});}catch{throw new Error('레슨의 TeX 수식을 확인하세요: '+tex);}};
 const markdown=(text:string)=>{const math=[...text.matchAll(/\$\$?([\s\S]*?)\$\$?/g)];const rest=text.replace(/\$\$?([\s\S]*?)\$\$?/g,'');if(rest.includes('$'))throw new Error('수식 구분자 $가 닫히지 않았습니다.');math.forEach(match=>check(match[1]));};
 if(lesson.intro)markdown(lesson.intro);
 for(const scene of lesson.scenes){scene.narration.forEach(s=>{markdown(s.text);for(const action of s.cue?.actions??[])if((action.type==='label'||action.type==='handwrite')&&action.tex)check(action.tex);});const stage=scene.stage;
  if(stage.type==='steps')stage.steps.forEach(s=>{check(s.tex);if(s.why)markdown(s.why);if(s.think)markdown(s.think);});
  if(stage.type==='chain')stage.nodes.forEach(n=>{if(n.tex)check(n.tex);markdown(n.text);});
  if(stage.type==='table')stage.rows.forEach(r=>r.cells.forEach(markdown));
  if(stage.type==='quiz'){markdown(stage.stem_md);stage.options.forEach(o=>markdown(o.text_md));markdown(stage.explain);}
 }
}
