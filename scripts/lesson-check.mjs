import {readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')){const url=new URL(`${specifier}.ts`,context.parentURL);if(existsSync(url))return nextResolve(url.href,context);}return nextResolve(specifier,context);}});
export async function checkedLesson(file,conceptDirectory='content/concepts'){
 const {validateLesson,lessonSchema}=await import('../lib/learn/lessons/schema.ts');
 const {conceptSeedSchema}=await import('../lib/learn/lessons/seed.ts');
 const lesson=lessonSchema.parse(JSON.parse(await readFile(resolve(file),'utf8')));
 const directory=resolve(conceptDirectory);const ids=new Set();
 for(const name of existsSync(directory)?await readdir(directory):[]){if(!name.endsWith('.json'))continue;const data=conceptSeedSchema.parse(JSON.parse(await readFile(resolve(directory,name),'utf8')));if(data.pack_id===lesson.pack_id)for(const node of data.nodes)ids.add(node.id);}
 return validateLesson(lesson,ids);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2),alignmentIndex=args.indexOf('--alignment'),file=args.find((value,index)=>!value.startsWith('--')&&(alignmentIndex<0||index!==alignmentIndex+1));if(!file)throw new Error('Usage: npm run lesson:check -- <file> [--timeline] [--alignment <json>]');const lesson=await checkedLesson(file);const {actionWarnings}=await import('../lib/learn/lessons/action-validation.ts');for(const scene of lesson.scenes)for(const warning of actionWarnings(scene))console.warn('WARN '+warning);if(args.includes('--timeline')){const {timelineReport}=await import('../lib/learn/lessons/timeline-report.ts');const {alignmentSchema}=await import('../lib/learn/lessons/alignment.ts');const raw=alignmentIndex>=0?JSON.parse(await readFile(resolve(args[alignmentIndex+1]),'utf8')):{};const alignments=Object.fromEntries(Object.entries(raw).map(([id,value])=>[id,value==null?null:alignmentSchema.parse(value)]));console.table(timelineReport(lesson,alignments));}console.log(`PASS ${lesson.id}: ${lesson.scenes.length} scenes, ${lesson.scenes.flatMap(s=>s.narration).length} sentences`);}catch(error){console.error(error.message);process.exitCode=1;}
}
