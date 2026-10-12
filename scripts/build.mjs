// Production build: bundles the app with esbuild, copies static files into dist/,
// and writes a service worker that caches every file so the app runs offline.
import { build } from 'esbuild';
import { cp, mkdir, rm, copyFile, readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const out = 'dist';
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: { app: 'src/main.tsx' },
  outdir: out,
  bundle: true,
  format: 'esm',
  minify: true,
  sourcemap: false,
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
});

await copyFile('index.html', `${out}/index.html`);
if (existsSync('public')) await cp('public', out, { recursive: true });

async function listFiles(dir) {
  const files = [];
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    if ((await stat(path)).isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }
  return files;
}

const files = (await listFiles(out)).sort();
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(await readFile(f));
const version = hash.digest('hex').slice(0, 12);
const urls = ['./', ...files.map((f) => `./${relative(out, f).split('\\').join('/')}`)];

const sw = (await readFile('src/sw.template.js', 'utf8'))
  .replace('__VERSION__', version)
  .replace('__FILES__', JSON.stringify(urls));
await writeFile(`${out}/sw.js`, sw);

console.log(`built ${files.length} files, version ${version}`);
