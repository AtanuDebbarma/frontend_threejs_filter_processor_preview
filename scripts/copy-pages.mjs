/**
 * Copy dist/ → docs/ for GitHub Pages (branch deploy, no Actions).
 * Run after: bun run build
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const docsDir = join(root, 'docs');

const indexHtml = join(distDir, 'index.html');
const manifest = join(distDir, 'manifest.json');
const robotsTxt = join(root, 'static-pages', 'robots.txt');

if (!existsSync(indexHtml) || !existsSync(manifest)) {
  console.error(
    'Missing dist/index.html or dist/manifest.json — run: bun run build',
  );
  process.exit(1);
}

const setupMd = join(root, 'docs', 'VERCEL_FIREWALL_SETUP.md');
const preservedSetup =
  existsSync(setupMd) ? readFileSync(setupMd, 'utf8') : null;

rmSync(docsDir, {recursive: true, force: true});
mkdirSync(docsDir, {recursive: true});

cpSync(indexHtml, join(docsDir, 'index.html'));
cpSync(manifest, join(docsDir, 'manifest.json'));
writeFileSync(join(docsDir, '.nojekyll'), '');

if (existsSync(robotsTxt)) {
  cpSync(robotsTxt, join(docsDir, 'robots.txt'));
}

if (preservedSetup) {
  writeFileSync(setupMd, preservedSetup);
}

console.log('Pages artifacts ready in docs/');
console.log('  index.html');
console.log('  manifest.json');
console.log('  robots.txt');
console.log('  .nojekyll');
if (preservedSetup) {
  console.log('  VERCEL_FIREWALL_SETUP.md (preserved)');
}
