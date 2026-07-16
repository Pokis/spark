import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'cmd.exe' : 'npm';
const npmArgs = isWindows ? ['/d', '/s', '/c', 'npm.cmd --version'] : ['--version'];

function commandVersion(command, args = ['--version']) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
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
];

console.log('\nSpark development doctor\n');
for (const check of checks) {
  const status = check.ok ? 'OK ' : check.optional ? 'INFO' : 'FAIL';
  console.log(`[${status}] ${check.name}: ${check.value ?? 'not found'}`);
  if (!check.ok) console.log(`       ${check.fix}`);
}

const envFile = join(root, '.env');
console.log(
  `\n[INFO] Cloud configuration: ${existsSync(envFile) ? '.env present' : 'not configured (core app still works)'}`,
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
