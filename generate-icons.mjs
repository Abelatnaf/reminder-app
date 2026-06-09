// scripts/generate-icons.mjs
// Run once: node scripts/generate-icons.mjs
// Requires: npm install sharp --save-dev
//
// Reads public/icon.svg → writes public/icon-192.png and public/icon-512.png

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, 'public', 'icon.svg');

const sizes = [192, 512];

for (const size of sizes) {
  const out = resolve(root, 'public', `icon-${size}.png`);
  await sharp(readFileSync(src))
    .resize(size, size)
    .png()
    .toFile(out);
  console.log(`✓ icon-${size}.png`);
}

console.log('Icons generated in public/');
