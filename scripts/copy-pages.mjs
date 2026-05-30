/**
 * Copy dist/ → docs/ for GitHub Pages (branch deploy, no Actions).
 * Run after: bun run build
 *
 * Does NOT regenerate docs/OTA_Fonts/manifest.json — use: bun run fonts:ota
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
const docsFontsDir = join(docsDir, 'OTA_Fonts');

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

/** Keep fonts OTA artifacts across editor-only docs refresh. */
const preservedFontsDir = join(root, '.tmp-preserved-ota-fonts');
if (existsSync(docsFontsDir)) {
  rmSync(preservedFontsDir, {recursive: true, force: true});
  cpSync(docsFontsDir, preservedFontsDir, {recursive: true});
}

rmSync(docsDir, {recursive: true, force: true});
mkdirSync(docsDir, {recursive: true});

cpSync(indexHtml, join(docsDir, 'index.html'));
cpSync(manifest, join(docsDir, 'manifest.json'));
writeFileSync(join(docsDir, '.nojekyll'), '');

if (existsSync(preservedFontsDir)) {
  cpSync(preservedFontsDir, docsFontsDir, {recursive: true});
  rmSync(preservedFontsDir, {recursive: true, force: true});
}

if (existsSync(robotsTxt)) {
  cpSync(robotsTxt, join(docsDir, 'robots.txt'));
}

if (preservedSetup) {
  writeFileSync(setupMd, preservedSetup);
}

console.log('Pages artifacts ready in docs/');
console.log('  index.html');
console.log('  manifest.json');
if (existsSync(docsFontsDir)) {
  console.log('  OTA_Fonts/ (preserved — manifest from bun run fonts:ota)');
} else {
  console.log('  (no OTA_Fonts — run bun run fonts:ota when publishing fonts)');
}
console.log('  robots.txt');
console.log('  .nojekyll');
if (preservedSetup) {
  console.log('  VERCEL_FIREWALL_SETUP.md (preserved)');
}
