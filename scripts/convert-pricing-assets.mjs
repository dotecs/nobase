import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Usage: node scripts/convert-pricing-assets.mjs <original-page-assets-directory>
const sourceArgument = process.argv[2];
if (!sourceArgument || process.argv.length !== 3) {
  console.error('Usage: node scripts/convert-pricing-assets.mjs <original-page-assets-directory>');
  process.exit(1);
}

const sourceDirectory = resolve(sourceArgument);
const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/pricing/n-training');
const assets = [
  ['01-hero-brand.png', 'hero-brand.webp', 1200, 150_000, true],
  ['02-hero-background.png', 'hero-bg.webp', 1800, 150_000, false],
  ['03-plan-basic.png', 'plan-basic.webp', 160, 15_000, true],
  ['04-plan-standard.png', 'plan-standard.webp', 160, 15_000, true],
  ['05-plan-premium.png', 'plan-premium.webp', 160, 15_000, true],
  ['06-benefit-pdf.png', 'benefit-pdf.webp', 96, 15_000, true],
  ['07-benefit-calendar.png', 'benefit-calendar.webp', 96, 15_000, true],
  ['08-benefit-feedback.png', 'benefit-feedback.webp', 96, 15_000, true],
];

// Validate all results before writing so a failed conversion does not leave a partial set.
const converted = await Promise.all(assets.map(async ([input, output, width, limit, transparent]) => {
  const source = await readFile(resolve(sourceDirectory, input));
  const original = await sharp(source).metadata();
  if (transparent && !original.hasAlpha) throw new Error(`${input}: missing source alpha channel`);
  let buffer;
  let quality;
  for (quality of [80, 70]) {
    buffer = await sharp(source).resize({ width }).webp({ quality, alphaQuality: 100 }).toBuffer();
    if (buffer.length <= limit) break;
  }
  if (buffer.length > limit) throw new Error(`${output}: ${buffer.length} bytes exceeds ${limit} at quality 70`);
  const metadata = await sharp(buffer).metadata();
  const stats = await sharp(buffer).stats();
  if (metadata.format !== 'webp' || metadata.width !== width) throw new Error(`${output}: unexpected format or width`);
  if (transparent && (!metadata.hasAlpha || stats.isOpaque)) throw new Error(`${output}: transparency was not preserved`);
  return { output, buffer, quality, width: metadata.width, height: metadata.height, transparent: !stats.isOpaque };
}));

await mkdir(outputDirectory, { recursive: true });
for (const { output, buffer, ...details } of converted) {
  await writeFile(resolve(outputDirectory, output), buffer);
  console.log(JSON.stringify({ file: output, bytes: buffer.length, ...details }));
}
