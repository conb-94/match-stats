// Generates the home-screen icons from public/logo.svg.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('public/icons', { recursive: true });
const sizes = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];
for (const [name, size] of sizes) {
  await sharp('public/logo.svg').resize(size, size).png().toFile(`public/icons/${name}`);
}
console.log('icons written');
