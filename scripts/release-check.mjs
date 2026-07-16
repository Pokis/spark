import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const required = [
  'apps/mobile/app.config.ts',
  'apps/mobile/eas.json',
  'apps/mobile/assets/spark-icon-v2.png',
  'apps/mobile/e2e/maestro/full-offline-flow.yaml',
  'docs/privacy-policy.md',
  'docs/security.md',
  'firestore.rules',
  'services/control-plane/Dockerfile',
];

let failed = false;
for (const path of required) {
  const ok = existsSync(join(root, path));
  console.log(`${ok ? '✓' : '✗'} ${path}`);
  failed ||= !ok;
}

const mobilePackage = JSON.parse(
  readFileSync(join(root, 'apps/mobile/package.json'), 'utf8'),
);
if (mobilePackage.version === '0.0.0') {
  console.error('✗ Set a real mobile version before release.');
  failed = true;
}
if (!mobilePackage.dependencies?.['expo-system-ui']) {
  console.error('✗ expo-system-ui is required for the configured automatic color scheme.');
  failed = true;
}

const privacyFiles = [
  'docs/privacy-policy.md',
  'apps/admin/public/privacy.html',
];
for (const path of privacyFiles) {
  const content = readFileSync(join(root, path), 'utf8');
  if (content.includes('REPLACE_ME')) {
    console.error(`✗ Replace operator placeholders in ${path}.`);
    failed = true;
  }
}

const appConfig = readFileSync(join(root, 'apps/mobile/app.config.ts'), 'utf8');
if (appConfig.includes("const packageName = 'com.sparkhabits.app'")) {
  console.warn(
    '⚠ Confirm com.sparkhabits.app is the final permanent Play package name before the first upload.',
  );
}

const maestroDirectory = join(root, 'apps', 'mobile', 'e2e', 'maestro');
const maestroFlows = existsSync(maestroDirectory)
  ? readFileSync(join(maestroDirectory, 'full-offline-flow.yaml'), 'utf8')
  : '';
if (!maestroFlows.includes('That was a real focus block')) {
  console.error('✗ The release Maestro flow does not assert the focus closure state.');
  failed = true;
}

console.log(
  '\nManual release requirements: privacy-policy URL, store screenshots, Health Apps declaration, content rating, and active Google Play product configuration.',
);

if (failed) process.exitCode = 1;
