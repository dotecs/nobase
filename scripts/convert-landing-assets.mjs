import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const sourceArgument = process.argv[2];
if (!sourceArgument || process.argv.length !== 3) {
  console.error('Usage: node scripts/convert-landing-assets.mjs <normalized-directory>');
  process.exit(1);
}
const sourceDirectory = resolve(sourceArgument);
const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/landing/n-training');
const assets = [
  ['M01-a-math.png', 'subject-math.webp', 480, 30_000, true],
  ['M01-b-physics.png', 'subject-physics.webp', 480, 30_000, true],
  ['M01-c-chemistry.png', 'subject-chemistry.webp', 480, 30_000, true],
  ['M01-d-interview.png', 'subject-interview.webp', 480, 30_000, true],
  ['M05-materials.png', 'materials-sheets.webp', 800, 120_000, true],
  ['M06-exam.png', 'exam-sheet.webp', 800, 120_000, true],
  ['M07-support.png', 'live-support.webp', 1000, 120_000, true],
  ['M03-curriculum.png', 'curriculum-steps.webp', 900, 120_000, true],
  ['R01-instructor-edited.jpg', 'instructor.webp', 480, 60_000, false],
];

// Preserve the reviewed canvas: proportional downscaling only, no crop or enlargement.
// Validate every result before writing any output.
const converted = await Promise.all(assets.map(async ([input, output, width, limit, transparent]) => {
  const source = await readFile(resolve(sourceDirectory, input));
  const original = await sharp(source).metadata();
  if (!original.width || !original.height || original.width < width) throw new Error(`${input}: source is smaller than target`);
  if (transparent && !original.hasAlpha) throw new Error(`${input}: missing alpha channel`);
  let buffer;
  let quality;
  for (quality of [80, 70]) {
    let pipeline = sharp(source).resize({ width, withoutEnlargement: true });
    if (!transparent) pipeline = pipeline.removeAlpha();
    buffer = await pipeline.webp({ quality, alphaQuality: 100 }).toBuffer();
    if (buffer.length <= limit) break;
  }
  if (buffer.length > limit) throw new Error(`${output}: ${buffer.length} bytes exceeds ${limit} at quality 70`);
  const metadata = await sharp(buffer).metadata();
  const stats = await sharp(buffer).stats();
  const expectedHeight = Math.round(original.height * width / original.width);
  if (metadata.format !== 'webp' || metadata.width !== width || metadata.height !== expectedHeight) throw new Error(`${output}: unexpected dimensions`);
  if (transparent && (!metadata.hasAlpha || stats.isOpaque)) throw new Error(`${output}: transparency was not preserved`);
  if (!transparent && metadata.hasAlpha) throw new Error(`${output}: unexpected alpha`);
  return { output, buffer, quality, width: metadata.width, height: metadata.height, alpha: !!metadata.hasAlpha };
}));
await mkdir(outputDirectory, { recursive: true });
for (const { output, buffer, ...details } of converted) {
  await writeFile(resolve(outputDirectory, output), buffer);
  console.log(JSON.stringify({ file: output, bytes: buffer.length, ...details }));
}
