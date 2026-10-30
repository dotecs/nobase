import {readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')){const url=new URL(`${specifier}.ts`,context.parentURL);if(existsSync(url))return nextResolve(url.href,context);}return nextResolve(specifier,context);}});
export async function checkedLesson(file){
 const {validateLesson}=await import('../lib/learn/lessons/schema.ts');
 const directory=resolve('content/concepts');const ids=new Set();
 for(const name of existsSync(directory)?await readdir(directory):[]){if(!name.endsWith('.json'))continue;const data=JSON.parse(await readFile(resolve(directory,name),'utf8'));for(const node of data.nodes??[])ids.add(node.id);}
 return validateLesson(JSON.parse(await readFile(resolve(file),'utf8')),ids);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(!process.argv[2])throw new Error('Usage: npm run lesson:check -- <file>');const lesson=await checkedLesson(process.argv[2]);console.log(`PASS ${lesson.id}: ${lesson.scenes.length} scenes, ${lesson.scenes.flatMap(s=>s.narration).length} sentences`);}catch(error){console.error(error.message);process.exitCode=1;}
}
