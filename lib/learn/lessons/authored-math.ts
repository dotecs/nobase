import {itemsOf,itemKatexOptions} from './items';
import {treeNodes} from './tree';
import {isExact} from './format-num';
import katex from 'katex';
import type { Lesson } from './schema';
/** Authored TeX has a wider vocabulary than student answers (e.g. ± and primes). */
export function validateAuthoredMath(lesson:Lesson){
 const check=(tex:string)=>{try{katex.renderToString(tex,{throwOnError:true,trust:false,strict:false});}catch{throw new Error('레슨의 TeX 수식을 확인하세요: '+tex);}};
 const markdown=(text:string)=>{const math=[...text.matchAll(/\$\$?([\s\S]*?)\$\$?/g)];const rest=text.replace(/\$\$?([\s\S]*?)\$\$?/g,'');if(rest.includes('$'))throw new Error('수식 구분자 $가 닫히지 않았습니다.');math.forEach(match=>check(match[1]));};
 if(lesson.intro)markdown(lesson.intro);
 for(const scene of lesson.scenes){
  for(const item of itemsOf(scene.stage)){const value=(item.tex??item.text??'').replace(/\{\{[^}]+\}\}/g,'1');if(item.tex){try{katex.renderToString(value,{throwOnError:true,strict:false,...itemKatexOptions(item.id)});}catch{throw new Error('레슨의 TeX 수식을 확인하세요: '+value);}}else markdown(value);}
  if(scene.headline?.formula)check(scene.headline.formula.replace(/\{\{[^}]+\}\}/g,'1'));
  if(scene.stage.type==='graph'||scene.stage.type==='slider')scene.stage.points?.forEach(p=>{if(p.label==='auto'&&((!p.x_tex&&!isExact(p.x))||(!p.y_tex&&!isExact(p.y))))throw new Error('점 ('+p.x+', '+p.y+')의 좌표를 정확한 식으로 쓰거나 label을 명시하세요');if(p.x_tex)check(p.x_tex);if(p.y_tex)check(p.y_tex);if(p.label&&p.label!=='auto')check(p.label);});
  for(const s of scene.narration)for(const a of s.cue?.actions??[])if(a.type==='point'&&a.label&&a.label!=='auto')check(a.label);
scene.narration.forEach(s=>{markdown(s.text);for(const action of s.cue?.actions??[])if((action.type==='label'||action.type==='handwrite')&&action.tex)check(action.tex);});const stage=scene.stage;
  if(stage.type==='steps')stage.steps.forEach(s=>{check(s.tex);if(s.why)markdown(s.why);if(s.think)markdown(s.think);});
  if(stage.type==='tree')treeNodes(stage.root).forEach(({node})=>{markdown(node.label);if(node.tex)check(node.tex);});
  if(stage.type==='chain')stage.nodes.forEach(n=>{if(n.tex)check(n.tex);markdown(n.text);});
  if(stage.type==='table'){stage.columns.forEach(markdown);stage.rows.forEach(r=>r.cells.forEach(markdown));}
  if(stage.type==='quiz'){markdown(stage.stem_md);stage.options.forEach(o=>markdown(o.text_md));markdown(stage.explain);}
 }
}
