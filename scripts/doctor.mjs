import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'cmd.exe' : 'npm';
const npmArgs = isWindows ? ['/d', '/s', '/c', 'npm.cmd --version'] : ['--version'];
const firebasePackagePath = join(
  root,
  'node_modules',
  'firebase-tools',
  'package.json',
);
const firebaseVersion = existsSync(firebasePackagePath)
  ? JSON.parse(readFileSync(firebasePackagePath, 'utf8')).version
  : null;

function commandVersion(command, args = ['--version']) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true' },
    })
      .trim()
      .split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

const checks = [
  {
    name: 'Node.js 22–24',
    value: process.version,
    ok: Number(process.versions.node.split('.')[0]) >= 22 &&
      Number(process.versions.node.split('.')[0]) < 25,
    fix: 'Install the current Node.js LTS release.',
  },
  {
    name: 'npm',
    value: commandVersion(npmCommand, npmArgs),
    ok: Boolean(commandVersion(npmCommand, npmArgs)),
    fix: 'npm is installed with Node.js. On Windows use npm.cmd if npm.ps1 is blocked.',
  },
  {
    name: 'Java',
    value: commandVersion('java', ['-version']),
    ok: Boolean(commandVersion('java', ['-version'])),
    fix: 'Install Android Studio, then set JAVA_HOME to its bundled JBR directory.',
    optional: true,
  },
  {
    name: 'Android Debug Bridge',
    value: commandVersion(isWindows ? 'adb.exe' : 'adb', ['version']),
    ok: Boolean(commandVersion(isWindows ? 'adb.exe' : 'adb', ['version'])),
    fix: 'Install Android SDK Platform Tools and add platform-tools to PATH.',
    optional: true,
  },
  {
    name: 'Dependencies',
    value: existsSync(join(root, 'node_modules')) ? 'installed' : null,
    ok: existsSync(join(root, 'node_modules')),
    fix: 'Run npm.cmd install from the repository root.',
  },
  {
    name: 'Firebase Emulator CLI',
    value: firebaseVersion,
    ok: Boolean(firebaseVersion),
    fix: 'Run npm.cmd install from the repository root.',
  },
  {
    name: 'Terraform',
    value: commandVersion('terraform', ['version']),
    ok: Boolean(commandVersion('terraform', ['version'])),
    fix: 'Install Terraform before applying Google Cloud infrastructure.',
    optional: true,
  },
];

console.log('\nSpark development doctor\n');
for (const check of checks) {
  const status = check.ok ? 'OK ' : check.optional ? 'INFO' : 'FAIL';
  console.log(`[${status}] ${check.name}: ${check.value ?? 'not found'}`);
  if (!check.ok) console.log(`       ${check.fix}`);
}

const mobileEnvFile = join(root, 'apps', 'mobile', '.env.local');
const adminEnvFile = join(root, 'apps', 'admin', '.env.local');
const apiEnvFile = join(root, 'services', 'control-plane', '.env');
console.log(
  `\n[INFO] Mobile cloud configuration: ${
    existsSync(mobileEnvFile) ? 'apps/mobile/.env.local present' : 'not configured (core app still works)'
  }`,
);
console.log(
  `[INFO] Admin configuration: ${
    existsSync(adminEnvFile) ? 'apps/admin/.env.local present' : 'not configured (dashboard stays offline)'
  }`,
);
console.log(
  `[INFO] Local API configuration: ${
    existsSync(apiEnvFile)
      ? 'services/control-plane/.env present'
      : 'copy services/control-plane/.env.example to .env for emulator mode'
  }`,
);

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
console.log(`[INFO] Spark repository version: ${packageJson.version}`);

const requiredFailures = checks.filter((check) => !check.ok && !check.optional);
if (requiredFailures.length) {
  console.log('\nFix the FAIL items above, then run this command again.\n');
  process.exitCode = 1;
} else {
  console.log('\nCore JavaScript tooling is ready. Android INFO items are needed for an emulator build.\n');
}
