import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const required = [
  'apps/mobile/app.config.ts',
  'apps/mobile/eas.json',
  'apps/mobile/assets/spark-icon-v2.png',
  'apps/mobile/e2e/maestro/full-offline-flow.yaml',
  'spark.ps1',
  'scripts/spark-ops.ps1',
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
const easConfig = JSON.parse(
  readFileSync(join(root, 'apps/mobile/eas.json'), 'utf8'),
);
if (mobilePackage.version === '0.0.0') {
  console.error('✗ Set a real mobile version before release.');
  failed = true;
}
if (!mobilePackage.dependencies?.['expo-system-ui']) {
  console.error('✗ expo-system-ui is required for the configured automatic color scheme.');
  failed = true;
}

if (easConfig.build?.production?.android?.buildType !== 'app-bundle') {
  console.error('✗ EAS production must create an Android app-bundle.');
  failed = true;
}
for (const track of ['internal', 'alpha', 'beta', 'production']) {
  if (easConfig.submit?.[track]?.android?.track !== track) {
    console.error(`✗ EAS submit profile ${track} must target the ${track} Play track.`);
    failed = true;
  }
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
const packageMatch = appConfig.match(/const\s+packageName\s*=\s*['"]([^'"]+)['"]/);
const packageName = packageMatch?.[1];
if (!packageName) {
  console.error('✗ Could not read the Android package ID from apps/mobile/app.config.ts.');
  failed = true;
} else {
  const identityFiles = [
    {
      path: 'spark.ps1',
      pattern: /\$script:PackageName\s*=\s*['"]([^'"]+)['"]/,
      label: 'PowerShell Android helper',
    },
    {
      path: 'apps/mobile/e2e/maestro/full-offline-flow.yaml',
      pattern: /^appId:\s*([^\s]+)\s*$/m,
      label: 'Maestro app ID',
    },
  ];

  const generatedGradle = 'apps/mobile/android/app/build.gradle';
  if (existsSync(join(root, generatedGradle))) {
    identityFiles.push({
      path: generatedGradle,
      pattern: /applicationId\s+['"]([^'"]+)['"]/,
      label: 'generated local Android application ID',
    });
  }

  for (const { path, pattern, label } of identityFiles) {
    const value = readFileSync(join(root, path), 'utf8').match(pattern)?.[1];
    if (!value) {
      console.error(`✗ Could not read the ${label} from ${path}.`);
      failed = true;
    } else if (value !== packageName) {
      console.error(`✗ ${label} is ${value}; expected ${packageName} from app.config.ts.`);
      failed = true;
    } else {
      console.log(`✓ ${label} matches ${packageName}.`);
    }
  }
}

if (packageName === 'com.sparkhabits.app') {
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
  '\nManual requirements before wider release: public privacy-policy URL, store screenshots, Health Apps declaration, and content rating. Active Google Play product configuration is needed only when purchases are enabled.',
);

if (failed) process.exitCode = 1;
