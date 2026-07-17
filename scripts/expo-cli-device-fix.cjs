'use strict';

const path = require('node:path');

const root = path.resolve(__dirname, '..');
const {
  AndroidDeviceManager
} = require(
  path.join(
    root,
    'node_modules',
    '@expo',
    'cli',
    'build',
    'src',
    'start',
    'platforms',
    'android',
    'AndroidDeviceManager.js'
  )
);
const {
  getDevicesAsync
} = require(
  path.join(
    root,
    'node_modules',
    '@expo',
    'cli',
    'build',
    'src',
    'start',
    'platforms',
    'android',
    'getDevices.js'
  )
);

// Expo SDK 57 resolves Android --device values only by display name. Wireless
// ADB uses a long mDNS serial, and some recent emulators do not return their AVD
// name through `adb emu avd name`. Accepting the already-discovered ADB pid lets
// Spark reliably target exactly the connected device the user selected.
const resolveFromNameAsync = AndroidDeviceManager.resolveFromNameAsync.bind(
  AndroidDeviceManager
);

AndroidDeviceManager.resolveFromNameAsync = async function resolveFromNameOrIdAsync(
  nameOrId
) {
  const devices = await getDevicesAsync();
  const device = devices.find(
    (candidate) =>
      candidate.name === nameOrId || candidate.pid === nameOrId
  );

  if (!device) {
    return resolveFromNameAsync(nameOrId);
  }

  return AndroidDeviceManager.resolveAsync({
    device,
    shouldPrompt: false
  });
};

require(path.join(root, 'node_modules', 'expo', 'bin', 'cli'));
