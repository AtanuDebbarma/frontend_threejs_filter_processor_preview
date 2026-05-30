/**
 * Fonts-only OTA manifest — independent of package.json / editor build.
 *
 * Source:  OTA_Fonts/version.json (manual semver + minAppVersion) + OTA_Fonts/*.(ttf|otf)
 * Output: docs/OTA_Fonts/manifest.json + font files (for deploy)
 *
 * Run when font assets or version change: bun run fonts:ota
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceFontsDir = join(root, 'OTA_Fonts');
const versionPath = join(sourceFontsDir, 'version.json');
const docsFontsDir = join(root, 'docs', 'OTA_Fonts');

const isSemverLike = version => /^\d+\.\d+(\.\d+)?([-.][\w.-]+)*$/i.test(version);

const isMobileFontFile = fileName => {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.ttf') || lower.endsWith('.otf');
};

const inferFontName = fileName => {
  const map = {
    'Poppins-Regular.ttf': 'Poppins_400Regular',
    'Poppins-Medium.ttf': 'Poppins_500Medium',
    'Poppins-Bold.ttf': 'Poppins_700Bold',
  };
  return map[fileName] ?? fileName.replace(/\.(ttf|otf)$/i, '');
};

if (!existsSync(versionPath)) {
  console.error(
    'Missing OTA_Fonts/version.json — e.g. { "version": "0.0.1", "minAppVersion": "0.0.0" }',
  );
  process.exit(1);
}

let fontBundleVersion;
let minAppVersion;
try {
  const parsed = JSON.parse(readFileSync(versionPath, 'utf8'));
  fontBundleVersion =
    typeof parsed.version === 'string' ? parsed.version.trim() : '';
  if (!fontBundleVersion) {
    throw new Error('version must be a non-empty string');
  }
  if (!isSemverLike(fontBundleVersion)) {
    throw new Error(
      `version must be semver-like (e.g. 0.0.1), got "${fontBundleVersion}"`,
    );
  }
  minAppVersion =
    typeof parsed.minAppVersion === 'string'
      ? parsed.minAppVersion.trim()
      : (process.env.FONT_MIN_APP_VERSION ?? '0.0.0');
} catch (err) {
  console.error('Invalid OTA_Fonts/version.json:', err);
  process.exit(1);
}

if (!existsSync(sourceFontsDir)) {
  console.error('Missing OTA_Fonts/ directory at repo root');
  process.exit(1);
}

const fontFileNames = readdirSync(sourceFontsDir).filter(isMobileFontFile);
if (fontFileNames.length === 0) {
  console.error('No .ttf/.otf files in OTA_Fonts/');
  process.exit(1);
}

mkdirSync(docsFontsDir, {recursive: true});

const fonts = fontFileNames.map(fileName => {
  const sourcePath = join(sourceFontsDir, fileName);
  const destPath = join(docsFontsDir, fileName);
  cpSync(sourcePath, destPath);
  const bytes = readFileSync(sourcePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const sizeBytes = statSync(sourcePath).size;
  return {
    name: inferFontName(fileName),
    file: fileName,
    url: fileName,
    sha256,
    sizeBytes,
  };
});

const bundleSha256 = createHash('sha256')
  .update(
    fonts
      .slice()
      .sort((a, b) => a.file.localeCompare(b.file))
      .map(f => `${f.file}:${f.sha256}`)
      .join('|'),
  )
  .digest('hex');

const manifest = {
  version: fontBundleVersion,
  sha256: bundleSha256,
  minAppVersion,
  generatedAt: new Date().toISOString(),
  fonts,
};

writeFileSync(
  join(docsFontsDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(`Wrote docs/OTA_Fonts/manifest.json`);
console.log(`  version: ${fontBundleVersion}`);
console.log(`  minAppVersion: ${minAppVersion}`);
console.log(`  sha256: ${bundleSha256.slice(0, 8)}…`);
console.log(`  fonts: ${fonts.length} file(s)`);
