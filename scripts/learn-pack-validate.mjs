import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
import { parse } from 'yaml';

// Node 24 strips TypeScript; resolve the schema's extensionless local import.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL?.endsWith('.ts')) {
    const url = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(url)) return nextResolve(url.href, context);
  }
  return nextResolve(specifier, context);
} });

export async function readPack(directory) {
  const read = async name => parse(await readFile(resolve(directory, `${name}.yaml`), 'utf8'));
  const [pack, units, abilities, edges, goals, materials, misconceptions, diagnostic] = await Promise.all(['pack', 'units', 'abilities', 'edges', 'goals', 'materials', 'misconceptions', 'diagnostic'].map(read));
  const files = (await readdir(resolve(directory, 'items'))).filter(name => /\.ya?ml$/.test(name)).sort();
  const items = (await Promise.all(files.map(async name => parse(await readFile(resolve(directory, 'items', name), 'utf8'))))).flat();
  return { pack, units, abilities, edges, goals, materials, misconceptions, diagnostic, items };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node scripts/learn-pack-validate.mjs <packDir>');
    const { validatePack } = await import(pathToFileURL(resolve('lib/learn/pack-schema.ts')).href);
    const result = validatePack(await readPack(resolve(process.argv[2])));
    result.warnings.forEach(message => console.warn(`WARN ${message}`));
    result.errors.forEach(message => console.error(`ERROR ${message}`));
    console.log(result.errors.length ? `FAIL: ${result.errors.length} errors` : `PASS: ${result.warnings.length} warnings`);
    process.exitCode = result.errors.length ? 1 : 0;
  } catch (error) { console.error(`ERROR ${error.message}`); process.exitCode = 1; }
}
