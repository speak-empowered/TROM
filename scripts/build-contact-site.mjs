import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';

const root = new URL('../', import.meta.url);
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const assets = {};

async function include(path) {
  assets['/' + path] = [
    contentTypes[extname(path)],
    (await readFile(new URL(path, root))).toString('base64'),
  ];
}

async function includeAssets(directory) {
  const entries = await readdir(new URL(directory + '/', root), { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = directory + '/' + entry.name;
    if (entry.isDirectory()) await includeAssets(path);
    else if (entry.isFile() && contentTypes[extname(path)]) await include(path);
  }
}

const pages = (await readdir(root)).filter(name => name.endsWith('.html')).sort();
for (const page of pages) await include(page);
await includeAssets('assets');

const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(new URL('server/', output), { recursive: true });
const worker = await readFile(new URL('worker/index.mjs', root), 'utf8');
await writeFile(new URL('server/index.js', output), 'const assets = ' + JSON.stringify(assets) + ';\n' + worker);
