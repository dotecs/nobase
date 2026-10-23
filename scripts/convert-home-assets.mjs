// Usage: node scripts/convert-home-assets.mjs <input-directory>
// Input names: A01-hero.png ... A07-goal-transfer.png, IDs, or output basenames.
import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/convert-home-assets.mjs <input-directory>');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const assets = [
  ['A01', 'home/hero-scene.webp', 1280, 800, 160],
  ['A02', 'programs/n-training.webp', 800, 500, 80],
  ['A03', 'programs/n-campus-math.webp', 800, 500, 80],
  ['A04', 'programs/transfer-math.webp', 800, 500, 80],
  ['A05', 'home/goal-ssit.webp', 320, 320, 30],
  ['A06', 'home/goal-university.webp', 320, 320, 30],
  ['A07', 'home/goal-transfer.webp', 320, 320, 30],
];
const files = await readdir(input);
for (const [id, output, width, height, maxKB] of assets) {
  const names = [id.toLowerCase(), path.basename(output, '.webp')];
  const matches = files.filter(file => (names.includes(path.parse(file).name.toLowerCase()) || path.parse(file).name.toLowerCase().startsWith(`${id.toLowerCase()}-`)) && /\.(png|jpe?g|webp)$/i.test(file));
  if (!matches.length) { console.log(`${id}: missing, keeping placeholder`); continue; }
  if (matches.length > 1) throw new Error(`${id}: ambiguous input (${matches.join(', ')})`);
  const source = path.join(input, matches[0]);
  const metadata = await sharp(source).metadata();
  if (Math.abs(metadata.width / metadata.height - width / height) > .01) throw new Error(`${id}: expected ${width}:${height} aspect ratio; normalize canvas first (no cropping)`);
  if (metadata.width < width || metadata.height < height) throw new Error(`${id}: input too small; no upscaling`);
  if (id >= 'A05' && !metadata.hasAlpha) throw new Error(`${id}: transparent input required`);
  let buffer;
  let usedQuality;
  for (const quality of [80, 75, 70, 65, 60, 55, 50]) {
    // Normalized canvases can have subpixel ratio rounding (e.g. 1321x825).
    // Resize to the specified canvas without cropping or enlarging either axis.
    buffer = await sharp(source).rotate().resize(width, height, { fit: 'fill', withoutEnlargement: true }).webp({ quality, alphaQuality: 100 }).toBuffer();
    usedQuality = quality;
    if (buffer.length <= maxKB * 1024) break;
    console.log(`${id}: quality ${quality}, ${buffer.length} bytes exceeds ${maxKB}KB; retrying lower quality`);
  }
  if (buffer.length > maxKB * 1024) throw new Error(`${id}: exceeds ${maxKB}KB at quality ${usedQuality}`);
  const result = await sharp(buffer).metadata();
  const destination = path.join(root, output);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, buffer);
  console.log(`${id}: ${output} ${result.width}x${result.height}, ${buffer.length} bytes (${(buffer.length / 1024).toFixed(2)}KB), quality ${usedQuality}, alpha ${result.hasAlpha}`);
}
console.log('변환된 에셋을 반영하려면 content/home.ts와 content/programs.ts의 해당 이미지 경로를 채워 주세요. content 파일은 자동으로 변경하지 않습니다.');
