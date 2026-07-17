import { spawn } from 'node:child_process';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mobileRoot = join(root, 'apps', 'mobile');
const mobileNodeModules = join(mobileRoot, 'node_modules');
const expoCli = join(root, 'node_modules', 'expo', 'bin', 'cli');
const expoAndroidCli = join(root, 'scripts', 'expo-cli-device-fix.cjs');
const requestedCommand = process.argv[2] ?? 'start';
const extraArgs = process.argv.slice(3);
const commands = {
  start: ['start'],
  android: ['run:android'],
  ios: ['run:ios']
};
const expoArgs = commands[requestedCommand];

if (!expoArgs) {
  console.error(
    `Unknown mobile command "${requestedCommand}". Use start, android, or ios.`
  );
  process.exit(1);
}

// npm may keep Expo Router inside the mobile workspace while hoisting Expo's
// CLI to the repository root. NODE_PATH lets the CLI's typed-route generator
// resolve the matching workspace package without duplicating dependencies.
const nodePath = [mobileNodeModules, process.env.NODE_PATH]
  .filter(Boolean)
  .join(delimiter);

const cli = requestedCommand === 'android' ? expoAndroidCli : expoCli;
const child = spawn(process.execPath, [cli, ...expoArgs, ...extraArgs], {
  cwd: mobileRoot,
  env: { ...process.env, NODE_PATH: nodePath },
  stdio: 'inherit'
});

child.on('error', (error) => {
  console.error(`Could not start Expo: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  if (requestedCommand === 'android' && code) {
    console.error(
      [
        '',
        'Android build/install did not finish.',
        'If the output reached "Installing ... app-debug.apk", the APK was built and the device connection or phone install policy failed.',
        'Run ".\\spark.cmd devices". The target must be listed with state "device" (not offline/unauthorized).',
        'For Wi-Fi debugging, unlock the phone and toggle Wireless debugging off/on or reconnect it in Android Studio, then use the newly printed model/ID.',
        'If adb reports INSTALL_FAILED_USER_RESTRICTED, approve the phone prompt and enable Install via USB / USB debugging security settings.'
      ].join('\n')
    );
  }
  process.exitCode = code ?? 1;
});
