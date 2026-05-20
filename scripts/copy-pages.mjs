/**
 * Copy dist/ → docs/ for GitHub Pages (branch deploy, no Actions).
 * Run after: bun run build
 */
import {cpSync, existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const docsDir = join(root, 'docs');

const indexHtml = join(distDir, 'index.html');
const manifest = join(distDir, 'manifest.json');

if (!existsSync(indexHtml) || !existsSync(manifest)) {
  console.error(
    'Missing dist/index.html or dist/manifest.json — run: bun run build',
  );
  process.exit(1);
}

rmSync(docsDir, {recursive: true, force: true});
mkdirSync(docsDir, {recursive: true});

cpSync(indexHtml, join(docsDir, 'index.html'));
cpSync(manifest, join(docsDir, 'manifest.json'));
writeFileSync(join(docsDir, '.nojekyll'), '');

console.log('Pages artifacts ready in docs/');
console.log('  index.html');
console.log('  manifest.json');
console.log('  .nojekyll');
