import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, statSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const indexPath = join(distDir, 'index.html');
const manifestPath = join(distDir, 'manifest.json');

const html = readFileSync(indexPath);
const sha256 = createHash('sha256').update(html).digest('hex');
const {size} = statSync(indexPath);

const pkg = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
);

const manifest = {
  version: pkg.version,
  url: 'index.html',
  sha256,
  sizeBytes: size,
  minAppVersion: process.env.EDITOR_MIN_APP_VERSION ?? '0.0.0',
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${manifestPath} (version ${manifest.version}, sha256 ${sha256.slice(0, 8)}…)`);
