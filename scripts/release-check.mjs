import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const storeListingFiles = [
  'ar-SA.md',
  'de-DE.md',
  'en-US.md',
  'es-ES.md',
  'fr-FR.md',
  'hi-IN.md',
  'id-ID.md',
  'it-IT.md',
  'ja-JP.md',
  'ko-KR.md',
  'lt-LT.md',
  'nl-NL.md',
  'pl-PL.md',
  'pt-BR.md',
  'ru-RU.md',
  'tr-TR.md',
  'uk-UA.md',
  'vi-VN.md',
  'zh-CN.md',
].map((name) => `store/android/listing/${name}`);
const required = [
  'apps/mobile/app.config.ts',
  'apps/mobile/eas.json',
  'apps/mobile/assets/spark-icon-v2.png',
  'apps/mobile/plugins/withSparkReleaseSigning.js',
  'apps/mobile/plugins/withSparkReleaseSigning.test.js',
  'apps/mobile/credentials/README.md',
  'apps/mobile/e2e/maestro/full-offline-flow.yaml',
  'spark.ps1',
  'scripts/spark-ops.ps1',
  'scripts/prepare-play-store-assets.ps1',
  'docs/privacy-policy.md',
  'docs/security.md',
  'store/android/README.md',
  'store/android/asset-manifest.md',
  'store/android/declarations.md',
  'store/android/release-decisions.md',
  'store/android/listing/README.md',
  ...storeListingFiles,
  'store/android/source/feature-graphic-background.png',
  'store/android/source/phone/01-today-final.png',
  'store/android/source/phone/focus-original.png',
  'store/android/source/phone/03-capture-final-clean.png',
  'store/android/source/phone/04-progress.png',
  'store/android/source/phone/05-settings.png',
  'store/android/source/phone/06-departure.png',
  'store/android/graphics/app-icon-512.png',
  'store/android/graphics/feature-graphic-1024x500.png',
  'store/android/graphics/phone/01-today.png',
  'store/android/graphics/phone/02-focus.png',
  'store/android/graphics/phone/03-capture.png',
  'store/android/graphics/phone/04-progress.png',
  'store/android/graphics/phone/05-leave-on-time.png',
  'store/android/graphics/phone/06-settings.png',
  'firestore.rules',
  'services/control-plane/Dockerfile',
];

function readPngInfo(path) {
  const bytes = readFileSync(join(root, path));
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
    size: bytes.length,
  };
}

let failed = false;
for (const path of required) {
  const ok = existsSync(join(root, path));
  console.log(`${ok ? '✓' : '✗'} ${path}`);
  failed ||= !ok;
}

const storeImages = [
  ['store/android/graphics/app-icon-512.png', 512, 512],
  ['store/android/graphics/feature-graphic-1024x500.png', 1024, 500],
  ...[
    '01-today.png',
    '02-focus.png',
    '03-capture.png',
    '04-progress.png',
    '05-leave-on-time.png',
    '06-settings.png',
  ].map((name) => [`store/android/graphics/phone/${name}`, 1080, 1920]),
];
for (const [path, expectedWidth, expectedHeight] of storeImages) {
  if (!existsSync(join(root, path))) continue;
  const info = readPngInfo(path);
  if (!info) {
    console.error(`✗ ${path} is not a valid PNG.`);
    failed = true;
  } else if (
    info.width !== expectedWidth ||
    info.height !== expectedHeight
  ) {
    console.error(
      `✗ ${path} is ${info.width}x${info.height}; expected ${expectedWidth}x${expectedHeight}.`,
    );
    failed = true;
  } else if (path.includes('app-icon') && (info.colorType !== 6 || info.size > 1024 * 1024)) {
    console.error(`✗ ${path} must be a 32-bit alpha PNG no larger than 1 MB.`);
    failed = true;
  } else if (!path.includes('app-icon') && info.colorType !== 2) {
    console.error(`✗ ${path} must be a 24-bit PNG without alpha.`);
    failed = true;
  } else {
    console.log(`✓ ${path} is ${expectedWidth}x${expectedHeight}.`);
  }
}

function textBlocks(path) {
  const content = readFileSync(join(root, path), 'utf8');
  return [...content.matchAll(/```text\s*\r?\n([\s\S]*?)\r?\n```/g)].map(
    (match) => match[1],
  );
}

for (const path of storeListingFiles) {
  const blocks = textBlocks(path);
  if (blocks.length < 3) {
    console.error(`✗ ${path} must contain app name, short description, and full description blocks.`);
    failed = true;
    continue;
  }
  const [name, shortDescription, fullDescription] = blocks;
  const lengths = [name, shortDescription, fullDescription].map((value) => [...value].length);
  if (lengths[0] > 30 || lengths[1] > 80 || lengths[2] > 4000) {
    console.error(
      `✗ ${path} exceeds a Play limit (name ${lengths[0]}/30, short ${lengths[1]}/80, full ${lengths[2]}/4000).`,
    );
    failed = true;
  } else {
    console.log(
      `✓ ${path} fits Play text limits (name ${lengths[0]}, short ${lengths[1]}, full ${lengths[2]}).`,
    );
  }
}

const assetManifest = readFileSync(join(root, 'store/android/asset-manifest.md'), 'utf8');
const screenshotDescriptions = assetManifest
  .split(/\r?\n/)
  .filter((line) => /^\| [1-6] \|/.test(line))
  .map((line) => line.split('|').at(-2)?.trim() ?? '');
if (
  screenshotDescriptions.length !== 6 ||
  screenshotDescriptions.some((description) =>
    [...description].length > 140 || description.length === 0
  )
) {
  console.error('✗ Asset manifest must contain six non-empty screenshot descriptions of at most 140 characters.');
  failed = true;
} else {
  console.log('✓ Asset manifest contains six screenshot descriptions within 140 characters.');
}

const baselineProfilePath = 'apps/mobile/assets/baseline-prof.txt';
const baselineProfile = readFileSync(join(root, baselineProfilePath), 'utf8');
const invalidClassProfileRule = baselineProfile
  .split(/\r?\n/)
  .find((line) => /^[HSP]+L[^;]+;$/.test(line.trim()));
if (invalidClassProfileRule) {
  console.error(
    `✗ ${baselineProfilePath} applies method-only flags to class rule: ${invalidClassProfileRule}`,
  );
  failed = true;
} else {
  console.log(`✓ ${baselineProfilePath} uses valid class-rule syntax.`);
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
  console.error('✗ The optional EAS production fallback must create an Android app-bundle.');
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
if (!appConfig.includes("'./plugins/withSparkReleaseSigning'")) {
  console.error('✗ Expo config must include the local production-signing plugin.');
  failed = true;
}
const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
if (
  !gitignore.includes('apps/mobile/credentials/*') ||
  !gitignore.includes('!apps/mobile/credentials/README.md')
) {
  console.error('✗ Git must ignore private mobile credentials while retaining their README.');
  failed = true;
} else {
  console.log('✓ Private local Android signing files are excluded from Git.');
}
const signingPlugin = readFileSync(
  join(root, 'apps/mobile/plugins/withSparkReleaseSigning.js'),
  'utf8',
);
const powershellReleaseHelper = readFileSync(
  join(root, 'scripts/spark-ops.ps1'),
  'utf8',
);
if (
  !signingPlugin.includes("System.getenv('SPARK_UPLOAD_PASSWORD')") ||
  !signingPlugin.includes('signingConfig signingConfigs.release') ||
  !powershellReleaseHelper.includes("Read-Host 'Enter the Spark application upload-key password (hidden)' -AsSecureString") ||
  !powershellReleaseHelper.includes("'--no-daemon', ':app:bundleRelease'") ||
  !powershellReleaseHelper.includes("GetEnvironmentVariable('SPARK_ALLOW_EAS_RELEASES', 'Process')")
) {
  console.error('✗ Android release safeguards must use the hidden prompt, environment-only secret, production config, non-daemon build, and disabled-by-default EAS cost flag.');
  failed = true;
} else {
  console.log('✓ Local Android signing keeps its password out of tracked files and persistent Gradle state.');
}
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

  if (existsSync(join(root, generatedGradle))) {
    const nativeGradle = readFileSync(join(root, generatedGradle), 'utf8');
    if (!nativeGradle.includes('// Spark application local production signing')) {
      console.error(
        '✗ generated Android is missing the local production-signing guard; run Expo prebuild.',
      );
      failed = true;
    } else if (!nativeGradle.includes('signingConfig signingConfigs.release')) {
      console.error(
        '✗ generated Android release output is not assigned to the production signing config.',
      );
      failed = true;
    } else {
      console.log(
        '✓ generated Android release output requires the local production signing path.',
      );
    }
  }
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
  '\nManual requirements before wider release: confirm the hosted privacy URL still opens, upload the prepared store pack, and personally attest the Play forms. Active Google Play product configuration is needed only when purchases are enabled.',
);

if (failed) process.exitCode = 1;
