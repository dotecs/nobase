import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { parse, stringify } from 'yaml';

const directory = resolve(process.argv[2] ?? 'content/learn/packs/root-math');
const units = parse(await readFile(resolve(directory, 'units.yaml'), 'utf8')).sort((a, b) => a.order - b.order);
const abilities = parse(await readFile(resolve(directory, 'abilities.yaml'), 'utf8'));
const edges = new Map();
function add(source, target) {
  if (source.id === target.id) throw new Error(`Self edge: ${source.id}`);
  const key = `${source.id}/${target.id}/prerequisite/book_order`;
  const hex = createHash('sha256').update(`${source.pack_id}/${key}`).digest('hex');
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  edges.set(key, { id, pack_id: source.pack_id, source_id: source.id, target_id: target.id, type: 'prerequisite', origin: 'book_order', status: 'hypothesis', reason: '교재 단원·소주제 순서' });
}
let previous;
for (const unit of units) {
  const rows = abilities.filter(row => row.unit_id === unit.id).sort((a, b) => a.order_in_unit - b.order_in_unit);
  if (!rows.length) throw new Error(`Empty unit: ${unit.id}`);
  if (previous) add(previous, rows[0]);
  for (let index = 1; index < rows.length; index++) add(rows[index - 1], rows[index]);
  previous = rows.at(-1);
}
await writeFile(resolve(directory, 'edges.yaml'), stringify([...edges.values()]));
console.log(`Generated ${edges.size} edges`);
